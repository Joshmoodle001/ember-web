import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("workflow_steps")
      .select("*")
      .eq("project_id", projectId)
      .order("step_order", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ steps: data });
  } catch (error) {
    console.error("Workflow fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id, title, step_order, status, notes } = body;

    if (!project_id || !title) {
      return NextResponse.json({ error: "project_id and title are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("workflow_steps")
      .insert([{
        project_id,
        title,
        step_order: step_order || 0,
        status: status || "pending",
        notes,
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ step: data }, { status: 201 });
  } catch (error) {
    console.error("Workflow step create error:", error);
    return NextResponse.json({ error: "Failed to create step" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Step ID is required" }, { status: 400 });
    }

    if (updates.status === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("workflow_steps")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ step: data });
  } catch (error) {
    console.error("Workflow step update error:", error);
    return NextResponse.json({ error: "Failed to update step" }, { status: 500 });
  }
}