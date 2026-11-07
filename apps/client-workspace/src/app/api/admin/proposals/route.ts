import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const [proposals, inquiries, clients] = await Promise.all([
    auth.supabase.from("proposals").select("id,inquiry_id,client_id,title,summary,proposal_url,amount_cents,currency,status,version,sent_at,accepted_at,share_token_expires_at,created_at,inquiries(name,company),clients(full_name,company)").order("created_at", { ascending: false }),
    auth.supabase.from("inquiries").select("id,name,company,stage").not("stage", "in", "(closed,delivered)").order("created_at", { ascending: false }),
    auth.supabase.from("clients").select("id,full_name,company").order("full_name"),
  ]);
  const error = proposals.error ?? inquiries.error ?? clients.error;
  if (error) {
    console.error("Proposal list query failed:", error.code);
    return NextResponse.json({ error: "Proposal records could not be loaded." }, { status: 503 });
  }
  return NextResponse.json({ proposals: proposals.data ?? [], inquiries: inquiries.data ?? [], clients: clients.data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: { inquiryId?: unknown; clientId?: unknown; title?: unknown; summary?: unknown; proposalUrl?: unknown; amount?: unknown };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "Invalid proposal details." }, { status: 400 }); }

  const inquiryId = typeof body.inquiryId === "string" ? body.inquiryId : null;
  const clientId = typeof body.clientId === "string" ? body.clientId : null;
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 180) : "";
  const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 5000) : "";
  const proposalUrl = typeof body.proposalUrl === "string" && body.proposalUrl.trim() ? body.proposalUrl.trim().slice(0, 1000) : null;
  const amount = typeof body.amount === "string" || typeof body.amount === "number" ? Number(body.amount) : NaN;
  const validId = (value: string | null) => value !== null && /^[0-9a-f-]{36}$/i.test(value);
  if ((!validId(inquiryId) && !validId(clientId)) || (inquiryId && clientId) || title.length < 2 || summary.length < 10 || !Number.isFinite(amount) || amount < 5 || amount > 10_000_000 || Math.round(amount * 100) !== amount * 100) {
    return NextResponse.json({ error: "Add an inquiry or client, summary, and valid ZAR amount of at least R5.00." }, { status: 400 });
  }
  if (proposalUrl) {
    try { if (new URL(proposalUrl).protocol !== "https:") throw new Error("URL must use HTTPS."); }
    catch { return NextResponse.json({ error: "Proposal links must be valid HTTPS URLs." }, { status: 400 }); }
  }

  const idColumn = inquiryId ? "inquiry_id" : "client_id";
  const idValue = inquiryId ?? clientId;
  const existing = await auth.supabase.from("proposals").select("version").eq(idColumn, idValue!).order("version", { ascending: false }).limit(1);
  if (existing.error) return NextResponse.json({ error: "Proposal version could not be checked." }, { status: 503 });
  const version = (existing.data?.[0]?.version ?? 0) + 1;
  const { data, error } = await auth.supabase.from("proposals").insert({
    inquiry_id: inquiryId,
    client_id: clientId,
    title,
    summary,
    proposal_url: proposalUrl,
    amount_cents: Math.round(amount * 100),
    currency: "ZAR",
    version,
  }).select("id,title,summary,proposal_url,amount_cents,currency,status,version,created_at").single();

  if (error) {
    console.error("Proposal create failed:", error.code);
    return NextResponse.json({ error: "Proposal could not be saved." }, { status: 503 });
  }
  return NextResponse.json({ proposal: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: { id?: unknown; status?: unknown };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "Invalid proposal update." }, { status: 400 }); }
  const statuses = new Set(["draft", "sent", "declined", "expired"]);
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || typeof body.status !== "string" || !statuses.has(body.status)) {
    return NextResponse.json({ error: "Choose a valid proposal status." }, { status: 400 });
  }
  const { data, error } = await auth.supabase.rpc("transition_proposal", { p_proposal_id: body.id, p_status: body.status });
  if (error) return NextResponse.json({ error: "Proposal status could not be updated." }, { status: 409 });
  if (!data) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
