import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("testimonials")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ testimonials: data || [] });
  } catch (error) {
    console.error("Testimonials fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch testimonials" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, company, role, content, rating, avatar_url, featured } = body;

    if (!name || !content) {
      return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("testimonials")
      .insert([{
        name,
        company: company || null,
        role: role || null,
        content,
        rating: rating || 5,
        avatar_url: avatar_url || null,
        featured: featured || false,
        status: "pending",
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ testimonial: data }, { status: 201 });
  } catch (error) {
    console.error("Testimonial create error:", error);
    return NextResponse.json({ error: "Failed to create testimonial" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Testimonial ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("testimonials")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ testimonial: data });
  } catch (error) {
    console.error("Testimonial update error:", error);
    return NextResponse.json({ error: "Failed to update testimonial" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Testimonial ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("testimonials").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Testimonial delete error:", error);
    return NextResponse.json({ error: "Failed to delete testimonial" }, { status: 500 });
  }
}