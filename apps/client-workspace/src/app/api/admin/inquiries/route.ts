import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";

const stages = new Set(["new", "discovery", "qualified", "proposal", "won", "active", "delivered", "closed"]);

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { id?: unknown; stage?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; stage?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || typeof body.stage !== "string" || !stages.has(body.stage)) {
    return NextResponse.json({ error: "Choose a valid inquiry stage." }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("transition_inquiry", {
    p_inquiry_id: body.id,
    p_stage: body.stage,
  });
  if (error) {
    console.error("Inquiry transition failed:", error.code);
    return NextResponse.json({ error: "The inquiry could not be updated." }, { status: 503 });
  }
  if (!data) return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
