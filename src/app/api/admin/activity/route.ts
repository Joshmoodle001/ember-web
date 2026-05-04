import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const entityType = searchParams.get("entity_type");

    let query = supabaseAdmin
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return NextResponse.json({ activities: data || [], total: count || 0 });
  } catch (error) {
    console.error("Activity log fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch activity log" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, entity_type, entity_id, description, metadata } = body;

    if (!action || !entity_type) {
      return NextResponse.json({ error: "action and entity_type are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("activity_log")
      .insert([{
        action,
        entity_type,
        entity_id: entity_id || null,
        description: description || null,
        metadata: metadata || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ activity: data }, { status: 201 });
  } catch (error) {
    console.error("Activity log create error:", error);
    return NextResponse.json({ error: "Failed to create activity log" }, { status: 500 });
  }
}