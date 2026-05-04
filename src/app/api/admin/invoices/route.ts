import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Invoice item structure from request body
interface InvoiceItem {
  quantity: number | string;
  unit_price: number | string;
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .select("*, client:clients(id, name, email, company), project:projects(id, title)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ invoices: data || [] });
  } catch (error) {
    console.error("Invoices fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_id, project_id, items, due_date, notes, status } = body;

    if (!client_id) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }

    const invoiceItems = items || [];
    const subtotal = invoiceItems.reduce((sum: number, item: InvoiceItem) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
    const vat = subtotal * 0.15;
    const total = subtotal + vat;

    const { data: countData } = await supabaseAdmin
      .from("invoices")
      .select("id", { count: "exact", head: true });

    const count = countData?.length ?? 0;
    const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

    const { data, error } = await supabaseAdmin
      .from("invoices")
      .insert([{
        invoice_number: invoiceNumber,
        client_id,
        project_id: project_id || null,
        items: invoiceItems,
        subtotal,
        vat,
        total,
        due_date: due_date || null,
        notes: notes || null,
        status: status || "draft",
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ invoice: data }, { status: 201 });
  } catch (error) {
    console.error("Invoice create error:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, items, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    if (items) {
      const subtotal = items.reduce((sum: number, item: InvoiceItem) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
      const vat = subtotal * 0.15;
      updates.items = items;
      updates.subtotal = subtotal;
      updates.vat = vat;
      updates.total = subtotal + vat;
    }

    const { data, error } = await supabaseAdmin
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ invoice: data });
  } catch (error) {
    console.error("Invoice update error:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });

    const { error } = await supabaseAdmin.from("invoices").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invoice delete error:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}