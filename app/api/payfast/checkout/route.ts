import { createHash } from "node:crypto";

const packages = {
  "launch-lite": { name: "EmberWeb Launch Lite", amount: "1500.00", description: "Once-off launch fee" },
  starter: { name: "EmberWeb Starter", amount: "2500.00", description: "Once-off launch fee" },
  business: { name: "EmberWeb Business", amount: "4000.00", description: "Once-off launch fee" },
  growth: { name: "EmberWeb Growth", amount: "6000.00", description: "Minimum once-off launch fee" },
} as const;

function payfastEncode(value: string) { return new URLSearchParams([["value", value.trim()]]).toString().slice(6); }
function signature(data: Record<string, string>) { return createHash("md5").update(Object.entries(data).filter(([, value]) => value !== "").map(([key, value]) => `${key}=${payfastEncode(value)}`).join("&")).digest("hex"); }
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character); }

export async function POST(request: Request) {
  const packageId = String((await request.formData()).get("package") ?? "");
  const selected = packages[packageId as keyof typeof packages];
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const siteUrl = process.env.PAYFAST_SITE_URL ?? "https://emberweb.co.za";
  if (!selected || !merchantId || !merchantKey) return new Response("Payment is not available right now. Please contact EmberWeb on WhatsApp.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  const fields: Record<string, string> = { merchant_id: merchantId, merchant_key: merchantKey, return_url: `${siteUrl}/payment/success?package=${encodeURIComponent(packageId)}`, cancel_url: `${siteUrl}/payment/cancel?package=${encodeURIComponent(packageId)}`, notify_url: `${siteUrl}/api/payfast/itn`, m_payment_id: `EW-${packageId}-${Date.now()}`, amount: selected.amount, item_name: selected.name, item_description: selected.description, custom_str1: packageId };
  fields.signature = signature(fields);
  const inputs = Object.entries(fields).map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`).join("");
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Taking you to secure payment…</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#061a29;color:#f5ecdf;font-family:Arial,sans-serif}.card{max-width:420px;padding:32px;text-align:center}.dot{width:14px;height:14px;margin:0 auto 20px;border-radius:50%;background:#c8fc37;box-shadow:0 0 28px #c8fc37;animation:p 1s infinite alternate}@keyframes p{to{transform:scale(.5);opacity:.5}}p{line-height:1.5;color:#c1d2d1}</style></head><body><main class="card"><div class="dot"></div><h1>Opening secure PayFast payment</h1><p>You are being transferred to PayFast to pay the ${escapeHtml(selected.name)} launch fee.</p><form id="payfast" action="https://www.payfast.co.za/eng/process" method="post">${inputs}<button type="submit">Continue to PayFast</button></form></main><script>document.getElementById('payfast').submit()</script></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
