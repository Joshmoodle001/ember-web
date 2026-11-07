import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { paymentRequests } from "../../../../db/schema";

function encode(value: string) { return new URLSearchParams([["v", value.trim()]]).toString().slice(2); }

export async function POST(request: Request) {
  const data = Array.from((await request.formData()).entries()).map(([key, value]) => [key, String(value)] as [string, string]);
  const payload = Object.fromEntries(data);
  const serialised = data.filter(([key]) => key !== "signature").map(([key, value]) => `${key}=${encode(value)}`).join("&");
  const signatureMatches = payload.signature === createHash("md5").update(serialised).digest("hex");
  const payment = await getDb().select().from(paymentRequests).where(eq(paymentRequests.id, payload.custom_str1 ?? "")).get();
  const amountMatches = payment && Math.abs(Number(payload.amount_gross) - payment.amountCents / 100) < 0.01;
  const validator = await fetch("https://www.payfast.co.za/eng/query/validate", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(data).toString() });
  const payfastConfirms = validator.ok && (await validator.text()).trim() === "VALID";
  if (!signatureMatches || !amountMatches || !payfastConfirms) return new Response("Invalid payment notification", { status: 400 });
  if (payload.payment_status === "COMPLETE" && payment?.status === "pending") await getDb().update(paymentRequests).set({ status: "paid", payfastPaymentId: payload.pf_payment_id ?? null, paidAt: new Date().toISOString() }).where(eq(paymentRequests.id, payment.id));
  return new Response("OK");
}
