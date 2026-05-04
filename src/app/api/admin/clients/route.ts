import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ clients: data });
  } catch (error) {
    console.error("Clients fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, phone, status, notes } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("clients")
      .insert([{ name, email, company, phone, status: status || "lead", notes, access_token: Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10) }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ client: data }, { status: 201 });
  } catch (error) {
    console.error("Client create error:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("clients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ client: data });
  } catch (error) {
    console.error("Client update error:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("clients").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Client delete error:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}