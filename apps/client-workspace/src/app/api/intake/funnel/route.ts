import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readLimitedText } from "@/lib/request-body";
import { checkRateLimits, getTrustedClientIp } from "@/lib/rate-limit";

const origins = new Set(["https://emberweb.co.za", "https://www.emberweb.co.za"]);
const sources = new Set(["direct", "linkedin", "referral", "organic", "partner"]);
const milestones = new Set(["landing_visit", "audit_start"]);

export async function POST(request: NextRequest) {
  if (!origins.has(request.headers.get("origin") || "") || process.env.VERCEL_ENV === "preview") {
    return new NextResponse(null, { status: 403 });
  }
  let source: unknown, milestone: unknown;
  try {
    ({ source, milestone } = JSON.parse(await readLimitedText(request, 256)));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (typeof source !== "string" || !sources.has(source) || typeof milestone !== "string" || !milestones.has(milestone)) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    const client = createServiceClient();
    const ip = getTrustedClientIp(request.headers);
    if (!ip || !await checkRateLimits(client, [{ scope: "intake:funnel", identity: ip, limit: 60, windowSeconds: 3600 }])) {
      return new NextResponse(null, { status: 429 });
    }
    const { error } = await client.rpc("record_inquiry_funnel", { milestone_name: milestone, source_name: source });
    return new NextResponse(null, { status: error ? 503 : 204 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
