import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Type definitions based on database schema - using partial required for Supabase compatibility
interface Client {
  id: string;
  status: string;
  created_at?: string;
}

interface Project {
  id: string;
  status: string;
  budget: number | string | null;
  paid: number | string | null;
  due_date?: string;
}

interface Payment {
  id: string;
  amount: number | string | null;
  status: string;
  currency?: string | null;
  created_at?: string;
}

export async function GET() {
  try {
    const [clientsRes, projectsRes, paymentsRes, adminsRes] = await Promise.all([
      supabaseAdmin.from("clients").select("id, status", { count: "exact" }),
      supabaseAdmin.from("projects").select("id, status, budget, paid", { count: "exact" }),
      supabaseAdmin.from("payments").select("id, amount, status, currency", { count: "exact" }),
      supabaseAdmin.from("admins").select("id", { count: "exact" }),
    ]);

    const clients = (clientsRes.data || []) as Client[];
    const projects = (projectsRes.data || []) as Project[];
    const payments = (paymentsRes.data || []) as Payment[];

    const pipelineStages: Record<string, number> = {};
    projects.forEach((p: Project) => {
      pipelineStages[p.status] = (pipelineStages[p.status] || 0) + 1;
    });

    const totalRevenue = payments
      .filter((p: Payment) => p.status === "complete")
      .reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);

    const totalOwing = projects
      .filter((p: Project) => !["completed", "cancelled"].includes(p.status))
      .reduce((sum: number, p: Project) => sum + (Number(p.budget || 0) - Number(p.paid || 0)), 0);

    const activeProjects = projects.filter((p: Project) => ["in_progress", "review", "deposit"].includes(p.status)).length;

    const upcomingDeadlines = projects
      .filter((p: Project) => p.due_date && !["completed", "cancelled"].includes(p.status))
      .sort((a: Project, b: Project) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime())
      .slice(0, 5);

    const recentPayments = payments
      .sort((a: Payment, b: Payment) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);

    return NextResponse.json({
      stats: {
        totalClients: clients.length || 0,
        activeProjects,
        totalRevenue,
        totalOwing,
        pendingPayments: payments.filter((p: Payment) => p.status === "pending").length,
        newLeads: clients.filter((c: Client) => c.status === "lead").length,
        totalAdmins: adminsRes.count || (adminsRes.data?.length || 0),
        pipelineStages,
      },
      upcomingDeadlines,
      recentPayments,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}