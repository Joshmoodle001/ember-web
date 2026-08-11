import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { clients, paymentRequests } from "../../../../db/schema";

function encode(value: string) { return new URLSearchParams([["v", value.trim()]]).toString().slice(2); }
function signature(data: Record<string, string>) { return createHash("md5").update(Object.entries(data).map(([key, value]) => `${key}=${encode(value)}`).join("&")).digest("hex"); }
function escape(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character); }

export async function POST(request: Request) {
  const code = String((await request.formData()).get("code") ?? "").trim().toUpperCase();
  const db = getDb();
  const row = await db.select({ request: paymentRequests, client: clients }).from(paymentRequests).innerJoin(clients, eq(paymentRequests.clientId, clients.id)).where(and(eq(paymentRequests.paymentCode, code), eq(paymentRequests.status, "pending"))).get();
  const merchantId = process.env.PAYFAST_MERCHANT_ID; const merchantKey = process.env.PAYFAST_MERCHANT_KEY; const siteUrl = process.env.PAYFAST_SITE_URL ?? "https://emberweb.co.za";
  if (!row || !merchantId || !merchantKey) return new Response("This payment request is unavailable. Please contact EmberWeb.", { status: 404 });
  const fields: Record<string, string> = { merchant_id: merchantId, merchant_key: merchantKey, return_url: `${siteUrl}/payment/success`, cancel_url: `${siteUrl}/payment/cancel`, notify_url: `${siteUrl}/api/payfast/itn`, name_first: row.client.contactName, email_address: row.client.email, m_payment_id: row.request.id, amount: (row.request.amountCents / 100).toFixed(2), item_name: `EmberWeb — ${row.request.packageName}`, item_description: row.request.kind === "launch" ? "Once-off launch fee" : "Monthly EmberCare", custom_str1: row.request.id, custom_str2: row.request.kind };
  fields.signature = signature(fields);
  const inputs = Object.entries(fields).map(([name, value]) => `<input type="hidden" name="${escape(name)}" value="${escape(value)}">`).join("");
  return new Response(`<!doctype html><html><body><form id="payfast" action="https://www.payfast.co.za/eng/process" method="post">${inputs}<button type="submit">Continue to PayFast</button></form><script>document.getElementById('payfast').submit()</script></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
