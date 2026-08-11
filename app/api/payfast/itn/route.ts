import { createHash } from "node:crypto";

const expectedAmounts: Record<string, string> = { "launch-lite": "1500.00", starter: "2500.00", business: "4000.00", growth: "6000.00" };
function payfastEncode(value: string) { return new URLSearchParams([["value", value.trim()]]).toString().slice(6); }

export async function POST(request: Request) {
  const data = Array.from((await request.formData()).entries()).map(([key, value]) => [key, String(value)] as [string, string]);
  const payload = Object.fromEntries(data);
  const serialised = data.filter(([key]) => key !== "signature").map(([key, value]) => `${key}=${payfastEncode(value)}`).join("&");
  const calculated = createHash("md5").update(serialised).digest("hex");
  const expected = expectedAmounts[payload.custom_str1];
  const amountMatches = expected && Math.abs(Number(payload.amount_gross) - Number(expected)) < 0.01;
  const signatureMatches = payload.signature?.length === calculated.length && payload.signature === calculated;
  const validator = await fetch("https://www.payfast.co.za/eng/query/validate", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(data).toString() });
  const payfastConfirms = validator.ok && (await validator.text()).trim() === "VALID";
  if (!signatureMatches || !amountMatches || !payfastConfirms) return new Response("Invalid payment notification", { status: 400 });
  return new Response("OK", { status: 200 });
}
