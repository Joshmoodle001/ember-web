import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";

function optionalDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [clients, invoices, duplicatePayments, payments] = await Promise.all([
    auth.supabase.from("clients").select("id,full_name,company,email").order("full_name"),
    auth.supabase.from("invoices").select("id,invoice_number,description,amount_cents,currency,status,due_on,created_at,clients(full_name,company)").order("created_at", { ascending: false }),
    auth.supabase.from("payments").select("id,amount_cents,created_at,invoices(invoice_number)").not("duplicate_of", "is", null).order("created_at", { ascending: false }),
    auth.supabase.from("payments").select("id,amount_cents,currency,status,duplicate_of,created_at,invoices(invoice_number,client_id,clients(full_name,company))").order("created_at", { ascending: false }).limit(200),
  ]);
  if (clients.error || invoices.error || duplicatePayments.error || payments.error) {
    console.error("Finance data query failed:", clients.error?.code ?? invoices.error?.code ?? duplicatePayments.error?.code ?? payments.error?.code);
    return NextResponse.json({ error: "Finance records could not be loaded." }, { status: 503 });
  }
  return NextResponse.json({ clients: clients.data ?? [], invoices: invoices.data ?? [], duplicatePayments: duplicatePayments.data ?? [], payments: payments.data ?? [], paymentHistoryLimit: 200, payfastReady: Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY && process.env.PAYFAST_PASSPHRASE) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { clientId?: unknown; description?: unknown; amount?: unknown; dueOn?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid invoice details." }, { status: 400 });
  }
  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 1000) : "";
  const amount = typeof body.amount === "string" || typeof body.amount === "number" ? Number(body.amount) : NaN;
  const dueOn = optionalDate(body.dueOn);

  if (!/^[0-9a-f-]{36}$/i.test(clientId) || description.length < 2 || !Number.isFinite(amount) || amount < 5 || amount > 10_000_000 || Math.round(amount * 100) !== amount * 100 || dueOn === undefined) {
    return NextResponse.json({ error: "Enter a client, a description, and a valid ZAR amount of at least R5.00." }, { status: 400 });
  }

  const invoiceNumber = `EW-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const { data, error } = await auth.supabase.from("invoices").insert({
    client_id: clientId,
    invoice_number: invoiceNumber,
    description,
    amount_cents: Math.round(amount * 100),
    currency: "ZAR",
    due_on: dueOn,
    status: "draft",
  }).select("id,invoice_number,description,amount_cents,currency,status,due_on,created_at").single();

  if (error) {
    console.error("Invoice create failed:", error.code);
    return NextResponse.json({ error: "Invoice could not be created." }, { status: 503 });
  }
  return NextResponse.json({ invoice: data }, { status: 201 });
}
