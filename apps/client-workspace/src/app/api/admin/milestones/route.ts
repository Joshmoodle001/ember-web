import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: { id?: unknown; status?: unknown };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "Invalid milestone update." }, { status: 400 }); }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || typeof body.status !== "string" || !["pending", "in_progress", "done"].includes(body.status)) {
    return NextResponse.json({ error: "Choose a valid milestone status." }, { status: 400 });
  }
  const { data, error } = await auth.supabase.rpc("transition_milestone", { p_milestone_id: body.id, p_status: body.status });
  if (error) return NextResponse.json({ error: "Milestone could not be updated." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
