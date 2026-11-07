import type { NextRequest } from "next/server";
import { toPayFastItnValidationBody, verifyPayFastItnSignature, type PayFastField } from "@/lib/payfast";
import { isTrustedPayFastItnSource } from "@/lib/payfast-source-ip";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function amountToCents(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

export async function POST(request: NextRequest) {
  if (!isTrustedPayFastItnSource(request.headers)) {
    return new Response("INVALID_SOURCE", { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const mode = process.env.PAYFAST_MODE || "sandbox";
  if (!passphrase || !merchantId || !["sandbox", "live"].includes(mode)) return new Response("PAYMENT_CONFIGURATION_REQUIRED", { status: 503 });

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/x-www-form-urlencoded")) return new Response("INVALID_CONTENT_TYPE", { status: 400 });
  const rawBody = await request.text();
  if (rawBody.length > 20_000) return new Response("PAYLOAD_TOO_LARGE", { status: 413 });
  const form = new URLSearchParams(rawBody);
  const fields: PayFastField[] = [...form.entries()];
  if (fields.filter(([key]) => key === "signature").length !== 1 || fields.at(-1)?.[0] !== "signature") {
    return new Response("INVALID_NOTIFICATION", { status: 400 });
  }
  if (new Set(fields.map(([key]) => key)).size !== fields.length) {
    return new Response("INVALID_NOTIFICATION", { status: 400 });
  }
  const values = Object.fromEntries(fields);

  if (values.merchant_id !== merchantId || !verifyPayFastItnSignature(fields, passphrase)) {
    return new Response("INVALID_NOTIFICATION", { status: 400 });
  }

  const attemptId = values.m_payment_id || "";
  const invoiceId = values.custom_str1 || "";
  const providerReference = values.pf_payment_id || "";
  const paymentStatus = values.payment_status || "";
  const amountCents = amountToCents(values.amount_gross || "");
  const statusMap: Record<string, "pending" | "complete" | "failed" | "cancelled"> = {
    PENDING: "pending", COMPLETE: "complete", FAILED: "failed", CANCELLED: "cancelled",
  };
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId) || !/^[0-9a-f-]{36}$/i.test(attemptId) || !providerReference || providerReference.length > 110 || amountCents === null || !statusMap[paymentStatus]) {
    return new Response("INVALID_TRANSACTION", { status: 400 });
  }

  const validateUrl = mode === "sandbox" ? "https://sandbox.payfast.co.za/eng/query/validate" : "https://www.payfast.co.za/eng/query/validate";
  const validationBody = toPayFastItnValidationBody(fields);
  if (validationBody === null) return new Response("INVALID_NOTIFICATION", { status: 400 });
  let validation: string;
  try {
    const response = await fetch(validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: validationBody,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    validation = (await response.text()).trim();
    if (!response.ok || validation !== "VALID") return new Response("NOTIFICATION_NOT_VALIDATED", { status: 400 });
  } catch {
    return new Response("PAYFAST_VALIDATION_UNAVAILABLE", { status: 503 });
  }

  try {
    const supabase = createServiceClient();
    const { data: invoice, error: invoiceError } = await supabase.from("invoices")
      .select("id,amount_cents,currency,status")
      .eq("id", invoiceId)
      .maybeSingle();
    if (invoiceError) return new Response("INVOICE_LOOKUP_FAILED", { status: 503 });
    if (!invoice || invoice.status === "void" || invoice.currency !== "ZAR" || invoice.amount_cents !== amountCents) {
      return new Response("INVOICE_MISMATCH", { status: 400 });
    }
    const { error } = await supabase.rpc("record_payfast_itn", {
      p_invoice_id: invoiceId,
      p_attempt_id: attemptId,
      p_provider_reference: providerReference,
      p_amount_cents: amountCents,
      p_status: statusMap[paymentStatus],
      p_notify_id: values.pf_payment_id,
    });
    if (error) {
      console.error("PayFast notification could not be recorded:", error.code);
      return new Response("PAYMENT_RECORD_FAILED", { status: 503 });
    }
    return new Response("OK", { status: 200 });
  } catch {
    return new Response("PAYMENT_CONFIGURATION_REQUIRED", { status: 503 });
  }
}
