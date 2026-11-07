import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  deliverClaimedStaffNotification,
  isClaimedStaffNotification,
  isStaffEmailDeliveryConfigured,
} from "@/lib/notifications";
import { createServiceClient } from "@/lib/supabase/service";

type NotificationStatus = "pending" | "sending" | "sent" | "failed";
type StaffNotificationRow = {
  outbox_id: string;
  inquiry_id: string;
  inquiry_name: string;
  inquiry_email: string;
  status: NotificationStatus;
  attempts: number;
  next_attempt_at: string;
  lease_expires_at: string | null;
  last_error_code: string | null;
  created_at: string;
  sent_at: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses = new Set<NotificationStatus>(["pending", "sending", "sent", "failed"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStaffNotificationRow(value: unknown): value is StaffNotificationRow {
  return isRecord(value)
    && typeof value.outbox_id === "string"
    && uuidPattern.test(value.outbox_id)
    && typeof value.inquiry_id === "string"
    && uuidPattern.test(value.inquiry_id)
    && typeof value.inquiry_name === "string"
    && typeof value.inquiry_email === "string"
    && typeof value.status === "string"
    && statuses.has(value.status as NotificationStatus)
    && typeof value.attempts === "number"
    && Number.isInteger(value.attempts)
    && typeof value.next_attempt_at === "string"
    && (value.lease_expires_at === null || typeof value.lease_expires_at === "string")
    && (value.last_error_code === null || typeof value.last_error_code === "string")
    && typeof value.created_at === "string"
    && (value.sent_at === null || typeof value.sent_at === "string");
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("list_staff_email_notifications");
    if (error) {
      console.error("Staff notification list failed:", error.code);
      return NextResponse.json({ error: "Notification status could not be loaded." }, { status: 503 });
    }
    if (!Array.isArray(data) || !data.every(isStaffNotificationRow)) {
      console.error("Staff notification list returned an invalid response.");
      return NextResponse.json({ error: "Notification status could not be loaded." }, { status: 503 });
    }
    return NextResponse.json({
      notifications: data,
      emailConfigured: isStaffEmailDeliveryConfigured(),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Notification status could not be loaded." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (Number(request.headers.get("content-length") ?? 0) > 1_000) {
    return NextResponse.json({ error: "Invalid notification request." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 1_000) {
      return NextResponse.json({ error: "Invalid notification request." }, { status: 413 });
    }
    const parsed: unknown = JSON.parse(rawBody);
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: "Invalid notification request." }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid notification request." }, { status: 400 });
  }

  if (typeof body.outbox_id !== "string" || !uuidPattern.test(body.outbox_id)) {
    return NextResponse.json({ error: "Choose a valid notification." }, { status: 400 });
  }
  if (!isStaffEmailDeliveryConfigured()) {
    return NextResponse.json({ error: "Resend is not configured for staff notifications yet." }, { status: 503 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("claim_staff_email_for_retry", {
      p_outbox_id: body.outbox_id.toLowerCase(),
      p_lease_seconds: 90,
    });
    if (error) {
      console.error("Staff notification retry could not be claimed:", error.code);
      return NextResponse.json({ error: "This notification could not be retried." }, { status: 503 });
    }
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "This notification is already being processed or is not available to retry." }, { status: 409 });
    }
    const claim: unknown = data[0];
    if (!isClaimedStaffNotification(claim)) {
      console.error("Staff notification retry returned an invalid claim.");
      return NextResponse.json({ error: "This notification could not be retried." }, { status: 503 });
    }

    const status = await deliverClaimedStaffNotification(supabase, claim);
    const message = status === "sent"
      ? "Staff notification sent."
      : status === "sending"
        ? "The provider may have accepted this email; status reconciliation is pending."
        : "The retry finished and its delivery status was saved.";
    return NextResponse.json({ success: true, status, message }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.error("Staff notification retry could not be completed.");
    return NextResponse.json({ error: "This notification could not be retried." }, { status: 503 });
  }
}
