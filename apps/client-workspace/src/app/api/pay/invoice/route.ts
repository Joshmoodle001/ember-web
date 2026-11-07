import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return NextResponse.json({ error: "Invoice link is invalid or expired." }, { status: 404 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Invoice payment is not configured." }, { status: 503 });
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await supabase.rpc("get_invoice_for_payment", { p_token_hash: tokenHash }).maybeSingle();
  if (error) {
    console.error("Invoice share lookup failed:", error.code);
    return NextResponse.json({ error: "Invoice payment is temporarily unavailable." }, { status: 503 });
  }
  if (!data) return NextResponse.json({ error: "Invoice link is invalid or expired." }, { status: 404 });
  return NextResponse.json({ invoice: data, payfastReady: Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY && process.env.PAYFAST_PASSPHRASE) }, { headers: { "Cache-Control": "private, no-store" } });
}
