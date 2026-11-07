import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";

const projectStatuses = new Set(["not_started", "in_progress", "review", "delivered", "on_hold"]);

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const [projects, clients] = await Promise.all([
    auth.supabase.from("projects").select("id,client_id,title,summary,status,progress,due_on,created_at,clients(full_name,company),milestones(id,title,status,position,due_on,completed_at)").order("created_at", { ascending: false }),
    auth.supabase.from("clients").select("id,full_name,company").order("full_name"),
  ]);
  const error = projects.error ?? clients.error;
  if (error) {
    console.error("Project list query failed:", error.code);
    return NextResponse.json({ error: "Projects could not be loaded." }, { status: 503 });
  }
  return NextResponse.json({ projects: projects.data ?? [], clients: clients.data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: { clientId?: unknown; title?: unknown; summary?: unknown; dueOn?: unknown };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "Invalid project details." }, { status: 400 }); }
  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 180) : "";
  const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 3000) : "";
  const dueOn = typeof body.dueOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueOn) ? body.dueOn : null;
  if (!/^[0-9a-f-]{36}$/i.test(clientId) || title.length < 2 || (body.dueOn && !dueOn)) return NextResponse.json({ error: "Choose a client and enter a project name." }, { status: 400 });
  const { data, error } = await auth.supabase.rpc("create_project_with_milestones", { p_client_id: clientId, p_title: title, p_summary: summary, p_due_on: dueOn });
  if (error) {
    console.error("Project create failed:", error.code);
    return NextResponse.json({ error: "Project could not be created." }, { status: 503 });
  }
  return NextResponse.json({ projectId: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: { id?: unknown; status?: unknown; progress?: unknown };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "Invalid project update." }, { status: 400 }); }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || typeof body.status !== "string" || !projectStatuses.has(body.status) || typeof body.progress !== "number" || !Number.isInteger(body.progress) || body.progress < 0 || body.progress > 100) {
    return NextResponse.json({ error: "Choose a valid delivery stage and progress value." }, { status: 400 });
  }
  const { data, error } = await auth.supabase.rpc("transition_project", { p_project_id: body.id, p_status: body.status, p_progress: body.progress });
  if (error) return NextResponse.json({ error: "Project could not be updated." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
