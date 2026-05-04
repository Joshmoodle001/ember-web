import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("*, client:clients(id, name, email, company)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ projects: data });
  } catch (error) {
    console.error("Projects fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_id, title, description, service_type, status, priority, budget, due_date, notes, assigned_to } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert([{
        client_id: client_id || null,
        title,
        description,
        service_type,
        status: status || "inquiry",
        priority: priority || "medium",
        budget: budget || 0,
        due_date: due_date || null,
        notes,
        assigned_to: assigned_to || null,
        progress: body.progress || 0,
        client_message: body.client_message || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error) {
    console.error("Project create error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    if (updates.status === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    if (updates.status === "in_progress" && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ project: data });
  } catch (error) {
    console.error("Project update error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}