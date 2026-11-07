import { NextResponse, type NextRequest } from "next/server";
import { getCalendarBookingUrl } from "@/lib/public-links";
import { notifyStaffOfInquiry } from "@/lib/notifications";
import { checkRateLimits, getTrustedClientIp } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/request-body";

type IntakeBody = Record<string, unknown>;
type InquiryNotification = {
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  service: string;
  budget: string | null;
  brief: string;
};

const services = new Set(["web_design", "ai_development", "web_and_ai", "other"]);
const budgets = new Set(["under_10000", "10000_30000", "30000_75000", "75000_plus", "not_sure"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function successResponse() {
  return NextResponse.json({
    success: true,
    bookingUrl: getCalendarBookingUrl(),
  }, { status: 201 });
}

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > 12_000) {
    return NextResponse.json({ error: "The project brief is too large." }, { status: 413 });
  }

  let body: IntakeBody;
  try {
    const rawBody = await readLimitedText(request, 12_000);
    const parsed: unknown = JSON.parse(rawBody);
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: "Please submit a valid project brief." }, { status: 400 });
    }
    body = parsed;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "The project brief is too large." }, { status: 413 });
    return NextResponse.json({ error: "Please submit a valid project brief." }, { status: 400 });
  }

  const hasSubmissionId = Object.hasOwn(body, "submission_id");
  const rawSubmissionId = body.submission_id;
  if (hasSubmissionId && (typeof rawSubmissionId !== "string" || !uuidPattern.test(rawSubmissionId))) {
    return NextResponse.json({ error: "Please submit a valid project brief." }, { status: 400 });
  }
  const submissionId = hasSubmissionId ? (rawSubmissionId as string).toLowerCase() : null;

  if (clean(body.website, 200)) return NextResponse.json({ success: true, bookingUrl: null });

  const name = clean(body.name, 120);
  const company = clean(body.company, 160) || null;
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 40) || null;
  const service = clean(body.service, 40);
  const budget = clean(body.budget, 32) || null;
  const brief = clean(body.brief, 5000);

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !services.has(service) || brief.length < 20 || (budget && !budgets.has(budget))) {
    return NextResponse.json({ error: "Please check the required details and try again." }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "Project intake is temporarily unavailable. Please contact EmberWeb directly." }, { status: 503 });
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
    const clientIp = getTrustedClientIp(request.headers);
    const preflightChecks = clientIp
      ? [{ scope: "intake:ip", identity: clientIp, limit: 30, windowSeconds: 3600 }]
      : [{ scope: "intake:email", identity: email, limit: 5, windowSeconds: 3600 }];
    if (!await checkRateLimits(supabase, preflightChecks)) {
      return NextResponse.json({ error: "Please wait before sending another project brief." }, { status: 429 });
    }

    if (submissionId) {
      const { data: existingInquiry, error: lookupError } = await supabase
        .from("inquiries")
        .select("id")
        .eq("submission_id", submissionId)
        .maybeSingle();
      if (lookupError) {
        console.error("Inquiry idempotency lookup failed:", lookupError.code);
        return NextResponse.json({ error: "Project intake is temporarily unavailable. Please try again shortly." }, { status: 503 });
      }
      if (existingInquiry) return successResponse();
    }

    if (clientIp && !await checkRateLimits(supabase, [
      { scope: "intake:email", identity: email, limit: 5, windowSeconds: 3600 },
    ])) {
      return NextResponse.json({ error: "Please wait before sending another project brief." }, { status: 429 });
    }

    const inquiry = { submission_id: submissionId, name, company, email, phone, service, budget, brief };
    let inquiryId: string | null = null;
    let created = false;
    if (submissionId) {
      const { data, error } = await supabase
        .from("inquiries")
        .upsert(inquiry, { onConflict: "submission_id", ignoreDuplicates: true })
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("Inquiry submission failed:", error.code);
        return NextResponse.json({ error: "Project intake is temporarily unavailable. Please try again shortly." }, { status: 503 });
      }
      if (data?.id) {
        inquiryId = data.id;
        created = true;
      } else {
        const { data: existingInquiry, error: lookupError } = await supabase
          .from("inquiries")
          .select("id")
          .eq("submission_id", submissionId)
          .maybeSingle();
        if (lookupError || !existingInquiry?.id) {
          console.error("Inquiry idempotency confirmation failed:", lookupError?.code ?? "missing-row");
          return NextResponse.json({ error: "Project intake is temporarily unavailable. Please try again shortly." }, { status: 503 });
        }
        return successResponse();
      }
    } else {
      const { data, error } = await supabase
        .from("inquiries")
        .insert(inquiry)
        .select("id")
        .single();
      if (error || !data?.id) {
        console.error("Inquiry submission failed:", error?.code ?? "missing-row");
        return NextResponse.json({ error: "Project intake is temporarily unavailable. Please try again shortly." }, { status: 503 });
      }
      inquiryId = data.id;
      created = true;
    }

    if (created && inquiryId) {
      try {
        await notifyStaffOfInquiry(supabase, inquiryId, {
          name,
          company,
          email,
          phone,
          service,
          budget,
          brief,
        } satisfies InquiryNotification);
      } catch {
        console.error("Staff inquiry notification could not be queued for delivery.");
      }
    }
  } catch {
    return NextResponse.json({ error: "Project intake is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }

  return successResponse();
}
