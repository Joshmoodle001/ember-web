import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("admins")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ admins: data || [] });
  } catch (error) {
    console.error("Admins fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, role, assigned_projects } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("admins")
      .insert([{
        name,
        email,
        role: role || "admin",
        assigned_projects: assigned_projects || [],
        status: "active",
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ admin: data }, { status: 201 });
  } catch (error) {
    console.error("Admin create error:", error);
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("admins")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ admin: data });
  } catch (error) {
    console.error("Admin update error:", error);
    return NextResponse.json({ error: "Failed to update admin" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("admins").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
  }
}