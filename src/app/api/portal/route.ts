import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Type definitions based on database schema
interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
  access_token: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  service_type: string | null;
  budget: number | string | null;
  paid: number | string | null;
  due_date: string | null;
  progress: number | null;
  client_message: string | null;
  created_at: string;
  milestones?: Milestone[];
}

interface Milestone {
  id: string;
  project_id: string;
  title: string | null;
  description: string | null;
  status: string;
  order_num: number;
  due_date: string | null;
  completed_at: string | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    let clientData: Client | null = null;

    if (token) {
      const { data, error } = await supabaseAdmin
        .from("clients")
        .select("id, name, email, company, status, access_token")
        .eq("access_token", token)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
      }
      clientData = data as Client;
    } else if (email) {
      const { data, error } = await supabaseAdmin
        .from("clients")
        .select("id, name, email, company, status, access_token")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "No account found with that email" }, { status: 404 });
      }
      clientData = data as Client;
    } else {
      return NextResponse.json({ error: "Token or email is required" }, { status: 400 });
    }

    if (clientData.status === "inactive" || clientData.status === "archived") {
      return NextResponse.json({ error: "Account is not active. Please contact us." }, { status: 403 });
    }

    const clientId = clientData.id;

    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("id, title, description, status, service_type, budget, paid, due_date, progress, client_message, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    const projectIds = (projects || []).map((p: Project) => p.id);

    const { data: allMilestones } = projectIds.length > 0
      ? await supabaseAdmin
          .from("project_milestones")
          .select("*")
          .in("project_id", projectIds)
          .order("order_num", { ascending: true })
      : { data: [] };

    const milestonesByProject: Record<string, Milestone[]> = {};
    (allMilestones || []).forEach((m: Milestone) => {
      if (!milestonesByProject[m.project_id]) milestonesByProject[m.project_id] = [];
      milestonesByProject[m.project_id].push(m);
    });

    const projectsWithMilestones = (projects || []).map((p: Project) => ({
      ...p,
      milestones: milestonesByProject[p.id] || [],
    }));

    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("id, amount, status, created_at, notes")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    const { data: invoices } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, total, status, due_date, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      client: {
        name: clientData.name,
        email: clientData.email,
        company: clientData.company,
        token: clientData.access_token,
      },
      projects: projectsWithMilestones,
      payments: payments || [],
      invoices: invoices || [],
    });
  } catch (error) {
    console.error("Client portal error:", error);
    return NextResponse.json({ error: "Failed to fetch client data" }, { status: 500 });
  }
}