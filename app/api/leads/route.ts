import { randomUUID } from "node:crypto";
import { getDb } from "../../../db";
import { leads } from "../../../db/schema";

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  if (clean(body.company, 100)) return Response.json({ ok: true }, { status: 201 });
  const contactName = clean(body.contactName, 120);
  const businessName = clean(body.businessName, 160);
  const email = clean(body.email, 254);
  const kind = clean(body.kind, 40);
  if (!contactName || !businessName || !email || !kind || !email.includes("@")) return Response.json({ error: "Please complete your name, business and email before continuing." }, { status: 400 });
  await getDb().insert(leads).values({ id: randomUUID(), kind, contactName, businessName, email, phone: clean(body.phone, 60), website: clean(body.website, 500), need: clean(body.need, 120), timing: clean(body.timing, 80), notes: clean(body.notes, 2000), source: clean(body.source, 600) || "direct" });
  return Response.json({ ok: true }, { status: 201 });
}
