"use client";

import { useState, useEffect } from "react";
import {
  Users, FolderKanban, CreditCard, TrendingUp, UserPlus, AlertCircle, ArrowUpRight, Clock, GitBranch,
} from "lucide-react";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AdminShell } from "@/components/admin/AdminShell";

interface DashboardData {
  stats: {
    totalClients: number;
    activeProjects: number;
    totalRevenue: number;
    totalOwing: number;
    pendingPayments: number;
    newLeads: number;
    totalAdmins: number;
    pipelineStages: Record<string, number>;
  };
  upcomingDeadlines: Array<{ id: string; title: string; service_type?: string; due_date?: string }>;
  recentPayments: Array<{ id: string; amount: number; status: string; client?: { name: string }; notes?: string }>;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 0 }).format(amount);

const COLORS = ["#00f0ff", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#00e5c3", "#6b7394", "#f97316", "#22c55e", "#06b6d4"];

const stageColors: Record<string, string> = {
  inquiry: "#a855f7",
  proposal: "#3b82f6",
  deposit: "#f59e0b",
  in_progress: "#00f0ff",
  review: "#f97316",
  delivered: "#22c55e",
  completed: "#10b981",
  on_hold: "#6b7394",
  cancelled: "#ef4444",
};

const stageLabels: Record<string, string> = {
  inquiry: "Inquiry",
  proposal: "Proposal",
  deposit: "Deposit",
  in_progress: "In Progress",
  review: "Review",
  delivered: "Delivered",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload) return null;
  return (
    <div className="card p-2 text-xs">
      <div className="text-[#f0f0f5]/80 font-mono-accent">{label}</div>
      {payload.map((entry, i: number) => (
        <div key={i} className="font-mono-accent" style={{ color: entry.color }}>
          {entry.name.includes("revenue") || entry.name.includes("cumulative") ? formatCurrency(entry.value) : entry.value}
        </div>
      ))}
    </div>
  );
};

interface ChartData {
  revenueChartData: Array<{ month: string; revenue: number; clients: number }>;
  cumulativeChartData: Array<{ month: string; cumulative: number }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, analyticsRes] = await Promise.all([
          fetch("/api/admin/dashboard"),
          fetch("/api/admin/analytics"),
        ]);
        if (dashRes.ok) setData(await dashRes.json() as DashboardData);
        if (analyticsRes.ok) setChartData(await analyticsRes.json() as ChartData);
      } catch (e: unknown) {
        if (e instanceof Error) {
          console.error(e.message);
        } else {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const stats = data?.stats || {
    totalClients: 0,
    activeProjects: 0,
    totalRevenue: 0,
    totalOwing: 0,
    pendingPayments: 0,
    newLeads: 0,
    totalAdmins: 0,
    pipelineStages: {},
  };

  const pipelineStages = stats.pipelineStages || {};
  const statCards = [
    { label: "Total Clients", value: stats.totalClients, icon: Users, color: "#00f0ff" },
    { label: "Active Projects", value: stats.activeProjects, icon: FolderKanban, color: "#3b82f6" },
    { label: "Revenue", value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: "#00e5c3" },
    { label: "Owing", value: formatCurrency(stats.totalOwing), icon: CreditCard, color: "#f59e0b" },
    { label: "Pending Payments", value: stats.pendingPayments, icon: AlertCircle, color: "#ef4444" },
    { label: "New Leads", value: stats.newLeads, icon: UserPlus, color: "#8b5cf6" },
  ];

  const pieData = Object.entries(pipelineStages).map(([name, value]) => ({
    name: stageLabels[name] || name,
    value: Number(value),
  }));

  const last6Months = (chartData?.revenueChartData || []).slice(-6);

  return (
    <AdminShell>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">Dashboard</h1>
        <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">Overview of your business</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {statCards.map((stat) => (
              <div key={stat.label} className="card p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}10` }}>
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-[#6b7394]/80" />
                </div>
                <div className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">{stat.value}</div>
                <div className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8">
            <div className="lg:col-span-2 card p-4 sm:p-5">
              <h3 className="font-display font-bold text-[#f0f0f5] mb-4 text-sm">Revenue Trend</h3>
              {last6Months.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={last6Months}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#121a2e" />
                    <XAxis dataKey="month" tick={{ fill: "#6b7394", fontSize: 10 }} tickFormatter={(v: string) => v?.substring(5) || v} />
                    <YAxis tick={{ fill: "#6b7394", fontSize: 10 }} tickFormatter={(v: number) => `R${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" name="revenue" stroke="#00f0ff" fill="url(#revGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-sm text-[#6b7394]/75 font-mono-accent">No revenue data yet</div>
              )}
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="font-display font-bold text-[#f0f0f5] mb-4 text-sm">Project Pipeline</h3>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" nameKey="name">
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
                    {pieData.map((entry, i) => (
                      <div key={entry.name} className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-[9px] font-mono-accent text-[#6b7394]/80">{entry.name} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[180px] text-sm text-[#6b7394]/75 font-mono-accent">No projects yet</div>
              )}
            </div>
          </div>

          <div className="card p-4 sm:p-5 mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-[#f0f0f5] text-sm">Pipeline Overview</h3>
              <a href="/admin/workflow" className="text-[10px] font-mono-accent text-[#00f0ff]/70 hover:text-[#00f0ff] transition-colors flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> View Workflow
              </a>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {Object.entries(pipelineStages).map(([stage, count], i, arr) => (
                <div key={stage} className="flex items-center flex-shrink-0">
                  <div className="text-center min-w-[80px]">
                    <div className="text-lg font-display font-bold" style={{ color: stageColors[stage] || "#6b7394" }}>{count}</div>
                    <div className="text-[9px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">{stage.replace(/_/g, " ")}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowUpRight className="w-3 h-3 text-[#6b7394]/80 rotate-45 mx-1" />
                  )}
                </div>
              ))}
              {Object.keys(pipelineStages).length === 0 && (
                <p className="text-sm text-[#6b7394]/75 font-mono-accent w-full text-center">No projects in pipeline yet</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <div className="card p-4 sm:p-5">
              <h3 className="font-display font-bold text-[#f0f0f5] mb-4 text-sm">Upcoming Deadlines</h3>
              {data?.upcomingDeadlines?.length ? (
                <div className="space-y-3">
                  {data.upcomingDeadlines.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#121a2e] last:border-0">
                      <div>
                        <div className="text-sm font-display text-[#f0f0f5]">{p.title}</div>
                        <div className="text-[10px] font-mono-accent text-[#6b7394]/75">{p.service_type || "Project"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-[#f59e0b]/60" />
                        <span className="text-[10px] font-mono-accent text-[#6b7394]">
                          {p.due_date ? new Date(p.due_date).toLocaleDateString("en-ZA") : "No date"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6b7394]/75 font-mono-accent">No upcoming deadlines</p>
              )}
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="font-display font-bold text-[#f0f0f5] mb-4 text-sm">Recent Payments</h3>
              {data?.recentPayments?.length ? (
                <div className="space-y-3">
                  {data.recentPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#121a2e] last:border-0">
                      <div>
                        <div className="text-sm font-display text-[#f0f0f5]">{formatCurrency(Number(p.amount))}</div>
                        <div className="text-[10px] font-mono-accent text-[#6b7394]/75">
                          {p.client?.name || p.notes?.substring(0, 30) || "Payment"}
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded ${
                        p.status === "complete" ? "bg-emerald-400/10 text-emerald-400" :
                        p.status === "pending" ? "bg-[#f59e0b]/10 text-[#f59e0b]" :
                        "bg-red-400/10 text-red-400"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6b7394]/75 font-mono-accent">No recent payments</p>
              )}
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}