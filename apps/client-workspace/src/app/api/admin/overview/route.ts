import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getCalendarBookingUrl } from "@/lib/public-links";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [inquiriesResult, invoicesResult, clientsResult, projectsResult] = await Promise.all([
    auth.supabase.from("inquiries").select("id,name,company,email,phone,service,budget,brief,stage,created_at").order("created_at", { ascending: false }).limit(50),
    auth.supabase.from("invoices").select("id,invoice_number,description,amount_cents,currency,status,due_on,created_at,clients(full_name,company)").order("created_at", { ascending: false }).limit(20),
    auth.supabase.from("clients").select("id,inquiry_id,full_name,company,email,created_at").order("created_at", { ascending: false }).limit(100),
    auth.supabase.from("projects").select("id,title,status,progress,due_on,created_at").order("created_at", { ascending: false }).limit(50),
  ]);

  const queryError = inquiriesResult.error ?? invoicesResult.error ?? clientsResult.error ?? projectsResult.error;
  if (queryError) {
    console.error("Workspace overview query failed:", queryError.code);
    return NextResponse.json({ error: "Workspace data could not be loaded." }, { status: 503 });
  }

  return NextResponse.json({
    inquiries: inquiriesResult.data ?? [],
    invoices: invoicesResult.data ?? [],
    clients: clientsResult.data ?? [],
    projects: projectsResult.data ?? [],
    bookingUrl: getCalendarBookingUrl(),
    payfastReady: Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY && process.env.PAYFAST_PASSPHRASE),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
