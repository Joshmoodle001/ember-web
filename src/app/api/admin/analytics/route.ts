import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Type definitions based on database schema
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
  created_at?: string;
  due_date?: string;
}

interface Payment {
  id: string;
  amount: number | string | null;
  status: string;
  created_at?: string;
}

export async function GET() {
  try {
    const [
      clientsRes,
      projectsRes,
      paymentsRes,
    ] = await Promise.all([
      supabaseAdmin.from("clients").select("id, status, created_at").order("created_at", { ascending: true }),
      supabaseAdmin.from("projects").select("id, status, budget, paid, created_at").order("created_at", { ascending: true }),
      supabaseAdmin.from("payments").select("id, amount, status, created_at").order("created_at", { ascending: true }),
    ]);

    const clients = (clientsRes.data || []) as Client[];
    const projects = (projectsRes.data || []) as Project[];
    const payments = (paymentsRes.data || []) as Payment[];

    const now = new Date();
    const months: string[] = [];
    const revenueByMonth: Record<string, number> = {};
    const clientsByMonth: Record<string, number> = {};
    const projectsByMonth: Record<string, number> = {};

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(key);
      revenueByMonth[key] = 0;
      clientsByMonth[key] = 0;
      projectsByMonth[key] = 0;
    }

    payments.filter((p: Payment) => p.status === "complete").forEach((p: Payment) => {
      const key = p.created_at?.substring(0, 7);
      if (key && revenueByMonth[key] !== undefined) revenueByMonth[key] += Number(p.amount);
    });

    clients.forEach((c: Client) => {
      const key = c.created_at?.substring(0, 7);
      if (key && clientsByMonth[key] !== undefined) clientsByMonth[key]++;
    });

    projects.forEach((p: Project) => {
      const key = p.created_at?.substring(0, 7);
      if (key && projectsByMonth[key] !== undefined) projectsByMonth[key]++;
    });

    const statusCounts: Record<string, number> = {};
    projects.forEach((p: Project) => { 
      if (p.status) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; 
    });

    const clientStatusCounts: Record<string, number> = {};
    clients.forEach((c: Client) => { 
      if (c.status) clientStatusCounts[c.status] = (clientStatusCounts[c.status] || 0) + 1; 
    });

    const totalRevenue = payments.filter((p: Payment) => p.status === "complete").reduce((s: number, p: Payment) => s + Number(p.amount), 0);
    const totalOwing = projects.filter((p: Project) => !["completed", "cancelled"].includes(p.status)).reduce((s: number, p: Project) => s + (Number(p.budget || 0) - Number(p.paid || 0)), 0);

    const revenueChartData = months.map((month) => ({
      month,
      revenue: revenueByMonth[month] || 0,
      clients: clientsByMonth[month] || 0,
      projects: projectsByMonth[month] || 0,
    }));

    let cumulativeRevenue = 0;
    const cumulativeChartData = months.map((month) => {
      cumulativeRevenue += revenueByMonth[month] || 0;
      return { month, cumulative: cumulativeRevenue };
    });

    return NextResponse.json({
      overview: {
        totalClients: clients.length,
        totalProjects: projects.length,
        totalRevenue,
        totalOwing,
        activeProjects: projects.filter((p: Project) => ["in_progress", "review", "deposit"].includes(p.status)).length,
        completedProjects: projects.filter((p: Project) => p.status === "completed").length,
        pendingPayments: payments.filter((p: Payment) => p.status === "pending").length,
      },
      revenueChartData,
      cumulativeChartData,
      statusCounts,
      clientStatusCounts,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}