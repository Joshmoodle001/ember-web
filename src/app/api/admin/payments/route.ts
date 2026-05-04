import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("*, project:projects(id, title), client:clients(id, name, email)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ payments: data });
  } catch (error) {
    console.error("Payments fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id, client_id, amount, notes } = body;

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("payments")
      .insert([{
        project_id: project_id || null,
        client_id: client_id || null,
        amount,
        status: "pending",
        notes,
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ payment: data }, { status: 201 });
  } catch (error) {
    console.error("Payment create error:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("payments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ payment: data });
  } catch (error) {
    console.error("Payment update error:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}