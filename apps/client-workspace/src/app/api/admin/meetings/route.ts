import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getCalendarBookingUrl } from "@/lib/public-links";

const statuses = new Set(["scheduled", "completed", "cancelled", "no_show"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const [meetings, inquiries] = await Promise.all([
    auth.supabase.from("meetings").select("id,inquiry_id,starts_at,status,notes,inquiries(name,company,email)").order("starts_at", { ascending: true }).limit(200),
    auth.supabase.from("inquiries").select("id,name,company").order("created_at", { ascending: false }).limit(100),
  ]);
  if (meetings.error || inquiries.error) return NextResponse.json({ error: "Meetings could not be loaded." }, { status: 503 });
  return NextResponse.json({ meetings: meetings.data, inquiries: inquiries.data, bookingUrl: getCalendarBookingUrl() }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: { inquiryId?: unknown; startsAt?: unknown; notes?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid meeting details." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid meeting details." }, { status: 400 });
  const inquiryId = typeof body.inquiryId === "string" ? body.inquiryId : "";
  const startsAt = typeof body.startsAt === "string" ? new Date(body.startsAt) : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (!uuid.test(inquiryId) || !startsAt || !Number.isFinite(startsAt.getTime()) || notes.length > 3000) {
    return NextResponse.json({ error: "Choose an enquiry and a valid appointment time." }, { status: 400 });
  }
  const { error } = await auth.supabase.from("meetings").insert({ inquiry_id: inquiryId, starts_at: startsAt.toISOString(), notes, booking_url: getCalendarBookingUrl() });
  if (error) return NextResponse.json({ error: "Meeting could not be recorded." }, { status: 503 });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: { id?: unknown; status?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid meeting update." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid meeting update." }, { status: 400 });
  if (typeof body.id !== "string" || !uuid.test(body.id) || typeof body.status !== "string" || !statuses.has(body.status)) {
    return NextResponse.json({ error: "Choose a valid meeting status." }, { status: 400 });
  }
  const { data, error } = await auth.supabase.from("meetings").update({ status: body.status }).eq("id", body.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Meeting could not be updated." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
