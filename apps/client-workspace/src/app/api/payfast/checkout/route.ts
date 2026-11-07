import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createPayFastSignature, type PayFastField } from "@/lib/payfast";
import { createServiceClient } from "@/lib/supabase/service";
import { getWorkspaceSiteOrigin } from "@/lib/public-links";
import { readLimitedText } from "@/lib/request-body";

type PaymentReservation = { attempt_id: string; invoice_id: string; invoice_number: string; description: string; amount_cents: number; currency: string };

function isPaymentReservation(value: unknown): value is PaymentReservation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.attempt_id === "string"
    && /^[0-9a-f-]{36}$/i.test(row.attempt_id)
    && typeof row.invoice_id === "string"
    && /^[0-9a-f-]{36}$/i.test(row.invoice_id)
    && typeof row.invoice_number === "string"
    && typeof row.description === "string"
    && typeof row.amount_cents === "number"
    && Number.isSafeInteger(row.amount_cents)
    && row.amount_cents >= 500
    && row.currency === "ZAR";
}

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > 2_000) {
    return NextResponse.json({ error: "Invalid invoice link." }, { status: 400 });
  }
  let parsedBody: unknown;
  try {
    const rawBody = await readLimitedText(request, 2_000);
    parsedBody = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid invoice link." }, { status: 400 });
  }
  if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) {
    return NextResponse.json({ error: "Invalid invoice link." }, { status: 400 });
  }
  const body = parsedBody as { token?: unknown };
  const token = typeof body.token === "string" ? body.token : "";
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return NextResponse.json({ error: "Invoice link is invalid or expired." }, { status: 404 });

  const mode = process.env.PAYFAST_MODE || "sandbox";
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  if (!merchantId || !merchantKey || !passphrase || !["sandbox", "live"].includes(mode)) {
    return NextResponse.json({ error: "Online payment is not configured yet. Please contact EmberWeb for payment options." }, { status: 503 });
  }
  const origin = getWorkspaceSiteOrigin();
  if (!origin) return NextResponse.json({ error: "Workspace site URL is not configured." }, { status: 503 });

  let serviceClient: ReturnType<typeof createServiceClient>;
  try {
    serviceClient = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Invoice payment is not configured." }, { status: 503 });
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await serviceClient.rpc("reserve_payfast_attempt", {
    p_token_hash: tokenHash,
    p_attempt_id: randomUUID(),
    p_expires_in_seconds: 1200,
  }).maybeSingle();
  if (error) return NextResponse.json({ error: "Invoice payment is temporarily unavailable." }, { status: 503 });
  const invoice = isPaymentReservation(data) ? data : null;
  if (!invoice) return NextResponse.json({ error: "This invoice is already being paid or cannot be paid through this link." }, { status: 409 });

  const amount = (invoice.amount_cents / 100).toFixed(2);
  const fields: PayFastField[] = [
    ["merchant_id", merchantId],
    ["merchant_key", merchantKey],
    ["return_url", `${origin}/pay/result?outcome=return`],
    ["cancel_url", `${origin}/pay/result?outcome=cancel`],
    ["notify_url", `${origin}/api/payfast/notify`],
    ["m_payment_id", invoice.attempt_id],
    ["amount", amount],
    ["item_name", invoice.invoice_number],
    ["item_description", invoice.description.slice(0, 255)],
    ["custom_str1", invoice.invoice_id],
  ];
  const signature = createPayFastSignature(fields, passphrase);
  const actionUrl = mode === "sandbox" ? "https://sandbox.payfast.co.za/eng/process" : "https://www.payfast.co.za/eng/process";
  return NextResponse.json({ actionUrl, fields: [...fields, ["signature", signature]] }, { headers: { "Cache-Control": "no-store" } });
}
