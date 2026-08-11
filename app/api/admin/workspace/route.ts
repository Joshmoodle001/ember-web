import { randomBytes, randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { clients, paymentRequests } from "../../../../db/schema";
import { isOwner } from "../../../admin/owner";

function error(message: string, status = 400) { return Response.json({ error: message }, { status }); }
async function guard() { return (await isOwner()) ? null : error("Not found", 404); }

export async function GET() {
  const denied = await guard(); if (denied) return denied;
  const db = getDb();
  const [clientRows, paymentRows] = await Promise.all([db.select().from(clients).orderBy(desc(clients.createdAt)), db.select().from(paymentRequests).orderBy(desc(paymentRequests.createdAt))]);
  return Response.json({ clients: clientRows, payments: paymentRows });
}

export async function POST(request: Request) {
  const denied = await guard(); if (denied) return denied;
  const body = await request.json() as Record<string, string>;
  const db = getDb();
  if (body.action === "create-client") {
    const contactName = body.contactName?.trim(); const businessName = body.businessName?.trim(); const email = body.email?.trim();
    if (!contactName || !businessName || !email) return error("Contact name, business name and email are required.");
    await db.insert(clients).values({ id: randomUUID(), contactName, businessName, email, phone: body.phone?.trim() ?? "", notes: body.notes?.trim() ?? "" });
    return Response.json({ message: "Client created." }, { status: 201 });
  }
  if (body.action === "create-payment") {
    const amount = Number(body.amount); const dueDate = body.dueDate; const kind = body.kind === "care" ? "care" : "launch";
    if (!body.clientId || !body.packageName || !dueDate || !Number.isFinite(amount) || amount < 5) return error("Choose a client, amount and due date before creating the request.");
    const client = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, body.clientId)).get();
    if (!client) return error("That client no longer exists.", 404);
    const billingDay = body.billingDay ? Number(body.billingDay) : null;
    if (billingDay !== null && (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28)) return error("Billing day must be between 1 and 28.");
    const code = `EW-${randomBytes(4).toString("hex").toUpperCase()}`;
    await db.insert(paymentRequests).values({ id: randomUUID(), clientId: body.clientId, kind, packageName: body.packageName.trim(), amountCents: Math.round(amount * 100), billingDay, dueDate, paymentCode: code });
    return Response.json({ message: `Payment code ${code} created. Open the client payment page to copy or share the link.` }, { status: 201 });
  }
  return error("Unknown workspace action.");
}
