import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string;
  service: string;
  message: string;
  status: string;
  created_at: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabaseAdmin
      .from("contact_submissions")
      .select("*, client:clients(id, name, email, company, status)")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    let leads = data || [];

    if (search) {
      const q = search.toLowerCase();
      leads = leads.filter((l: ContactSubmission) =>
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.service?.toLowerCase().includes(q) ||
        l.message?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ leads });
  } catch (error) {
    console.error("Leads fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("contact_submissions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ lead: data });
  } catch (error) {
    console.error("Lead update error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("contact_submissions").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead delete error:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}