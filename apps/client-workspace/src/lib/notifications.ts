import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveStaffEmailSender } from "@/lib/staff-email-sender";

export type StaffInquiryEmailPayload = {
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  service: string;
  budget: string | null;
  brief: string;
};

export type ClaimedStaffNotification = StaffInquiryEmailPayload & {
  outbox_id: string;
  inquiry_id: string;
  lease_token: string;
  attempts: number;
};

type ServiceClient = ReturnType<typeof createServiceClient>;
type DeliveryResult = "sent" | "pending" | "failed" | "sending";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const approvedStaffRecipient = "joshmoodley01@gmail.com";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isClaimedStaffNotification(value: unknown): value is ClaimedStaffNotification {
  return isRecord(value)
    && typeof value.outbox_id === "string"
    && uuidPattern.test(value.outbox_id)
    && typeof value.inquiry_id === "string"
    && uuidPattern.test(value.inquiry_id)
    && typeof value.lease_token === "string"
    && uuidPattern.test(value.lease_token)
    && typeof value.attempts === "number"
    && Number.isInteger(value.attempts)
    && typeof value.name === "string"
    && (value.company === null || typeof value.company === "string")
    && typeof value.email === "string"
    && emailPattern.test(value.email)
    && (value.phone === null || typeof value.phone === "string")
    && typeof value.service === "string"
    && (value.budget === null || typeof value.budget === "string")
    && typeof value.brief === "string";
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value) || value.length === 0 || !isRecord(value[0])) return null;
  return value[0];
}

function getRecipient() {
  const configured = (process.env.STAFF_NOTIFICATION_TO || approvedStaffRecipient).trim().toLowerCase();
  return configured === approvedStaffRecipient && emailPattern.test(configured) ? configured : null;
}

export function isStaffEmailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && getRecipient() && resolveStaffEmailSender(process.env.RESEND_FROM_EMAIL));
}

function safeText(value: string | null) {
  return value?.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim() || "Not provided";
}

async function markConfigurationMissing(supabase: ServiceClient, outboxId: string) {
  const { error } = await supabase.rpc("mark_staff_email_configuration_missing", {
    p_outbox_id: outboxId,
  });
  if (error) console.error("Staff email configuration status could not be saved:", error.code);
}

async function updateFailure(
  supabase: ServiceClient,
  claim: Pick<ClaimedStaffNotification, "outbox_id" | "lease_token">,
  errorCode: string,
  retryable: boolean,
) {
  const { data, error } = await supabase.rpc("fail_staff_email_delivery", {
    p_outbox_id: claim.outbox_id,
    p_lease_token: claim.lease_token,
    p_error_code: errorCode,
    p_retryable: retryable,
  });
  if (error || data !== true) {
    console.error("Staff email delivery status could not be saved:", error?.code ?? "claim-mismatch");
    return "sending" as const;
  }
  return retryable ? "pending" as const : "failed" as const;
}

export async function deliverClaimedStaffNotification(
  supabase: ServiceClient,
  claim: ClaimedStaffNotification,
): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const recipient = getRecipient();
  const sender = resolveStaffEmailSender(process.env.RESEND_FROM_EMAIL);
  if (!apiKey || !recipient || !sender) {
    await markConfigurationMissing(supabase, claim.outbox_id);
    return "pending";
  }

  const text = [
    "A new project brief was received through the EmberWeb website.",
    "",
    "Name: " + safeText(claim.name),
    "Company: " + safeText(claim.company),
    "Email: " + safeText(claim.email),
    "Phone: " + safeText(claim.phone),
    "Service: " + safeText(claim.service),
    "Budget: " + safeText(claim.budget),
    "",
    "Project brief:",
    safeText(claim.brief),
    "",
    "Inquiry reference: " + claim.inquiry_id,
  ].join("\n");

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": "emberweb-inquiry-" + claim.outbox_id,
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        reply_to: claim.email,
        subject: "New EmberWeb project inquiry",
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const code = error instanceof Error && error.name === "TimeoutError"
      ? "provider_timeout"
      : "provider_network_error";
    return updateFailure(supabase, claim, code, true);
  }

  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    const code = response.status === 429
      ? "provider_rate_limited"
      : response.status >= 500
        ? "provider_unavailable"
        : "provider_rejected";
    return updateFailure(supabase, claim, code, retryable);
  }

  let providerMessageId: string | null = null;
  try {
    const providerResult: unknown = await response.json();
    if (isRecord(providerResult) && typeof providerResult.id === "string" && providerResult.id.length <= 200) {
      providerMessageId = providerResult.id;
    }
  } catch {
    providerMessageId = null;
  }
  if (!providerMessageId) {
    return updateFailure(supabase, claim, "provider_invalid_response", true);
  }

  const { data, error } = await supabase.rpc("complete_staff_email_delivery", {
    p_outbox_id: claim.outbox_id,
    p_lease_token: claim.lease_token,
    p_provider_message_id: providerMessageId,
  });
  if (error || data !== true) {
    console.error("Staff email delivery status could not be saved:", error?.code ?? "claim-mismatch");
    return "sending";
  }
  return "sent";
}

export async function notifyStaffOfInquiry(
  supabase: ServiceClient,
  inquiryId: string,
  inquiry: StaffInquiryEmailPayload,
) {
  const outboxId = await getOutboxId(supabase, inquiryId);
  if (!outboxId) return;
  if (!isStaffEmailDeliveryConfigured()) {
    await markConfigurationMissing(supabase, outboxId);
    return;
  }

  const { data, error } = await supabase.rpc("claim_staff_email_for_delivery", {
    p_outbox_id: outboxId,
    p_lease_seconds: 90,
  });
  if (error) {
    console.error("Staff email delivery could not be claimed:", error.code);
    return;
  }

  const row = firstRecord(data);
  if (!row
    || typeof row.outbox_id !== "string"
    || !uuidPattern.test(row.outbox_id)
    || typeof row.inquiry_id !== "string"
    || !uuidPattern.test(row.inquiry_id)
    || typeof row.lease_token !== "string"
    || !uuidPattern.test(row.lease_token)
    || typeof row.attempts !== "number"
    || !Number.isInteger(row.attempts)) {
    return;
  }

  await deliverClaimedStaffNotification(supabase, {
    ...inquiry,
    outbox_id: row.outbox_id,
    inquiry_id: row.inquiry_id,
    lease_token: row.lease_token,
    attempts: row.attempts,
  });
}

async function getOutboxId(supabase: ServiceClient, inquiryId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("find_staff_email_outbox_id", {
    p_inquiry_id: inquiryId,
  });
  if (error || typeof data !== "string" || !uuidPattern.test(data)) {
    console.error("Staff email outbox job could not be found:", error?.code ?? "missing-row");
    return null;
  }
  return data;
}
