import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    let query = supabaseAdmin
      .from("project_milestones")
      .select("*")
      .order("order_num", { ascending: true });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ milestones: data || [] });
  } catch (error) {
    console.error("Milestones fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id, title, description, status, due_date, order_num } = body;

    if (!project_id || !title) {
      return NextResponse.json({ error: "Project ID and title are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("project_milestones")
      .insert([{
        project_id,
        title,
        description: description || null,
        status: status || "pending",
        due_date: due_date || null,
        order_num: order_num || 0,
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ milestone: data }, { status: 201 });
  } catch (error) {
    console.error("Milestone create error:", error);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Milestone ID is required" }, { status: 400 });
    }

    if (updates.status === "completed" && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("project_milestones")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ milestone: data });
  } catch (error) {
    console.error("Milestone update error:", error);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Milestone ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("project_milestones").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Milestone delete error:", error);
    return NextResponse.json({ error: "Failed to delete milestone" }, { status: 500 });
  }
}