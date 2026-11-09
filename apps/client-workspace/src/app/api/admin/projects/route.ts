import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";


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

export async function POST(){const auth=await requireAdmin();if(!auth.ok)return auth.response;return NextResponse.json({error:"Create a seed and allocate it from the project pipeline. Project IDs are issued at allocation."},{status:409});}
export async function PATCH(){const auth=await requireAdmin();if(!auth.ok)return auth.response;return NextResponse.json({error:"Use the project card to update delivery with its current revision."},{status:409});}
