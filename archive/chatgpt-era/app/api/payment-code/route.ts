import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { paymentRequests } from "../../../db/schema";

export async function POST(request: Request) {
  const code = String((await request.json() as { code?: string }).code ?? "").trim().toUpperCase();
  if (!/^EW-[A-F0-9]{8}$/.test(code)) return Response.json({ error: "Enter the payment code sent by EmberWeb." }, { status: 400 });
  const payment = await getDb().select({ packageName: paymentRequests.packageName, amountCents: paymentRequests.amountCents, dueDate: paymentRequests.dueDate, kind: paymentRequests.kind, paymentCode: paymentRequests.paymentCode }).from(paymentRequests).where(and(eq(paymentRequests.paymentCode, code), eq(paymentRequests.status, "pending"))).get();
  if (!payment) return Response.json({ error: "This payment code is not available. Please contact EmberWeb if you need help." }, { status: 404 });
  return Response.json({ payment });
}
