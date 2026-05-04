"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { TrendingUp, Users, FolderKanban, CreditCard, Target, CheckCircle2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#00f0ff", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#00e5c3", "#6b7394", "#f97316", "#22c55e", "#06b6d4"];

const statusLabels: Record<string, string> = {
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

const clientStatusLabels: Record<string, string> = {
  lead: "Lead",
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 0 }).format(amount);

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
          {entry.name}: {entry.name.includes("revenue") || entry.name.includes("cumulative") ? formatCurrency(entry.value) : entry.value}
        </div>
      ))}
    </div>
  );
};

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalOwing: number;
    totalClients: number;
    activeProjects: number;
    completedProjects: number;
    pendingPayments: number;
  };
  statusCounts: Record<string, number>;
  clientStatusCounts: Record<string, number>;
  revenueChartData: Array<{ month: string; revenue: number; clients: number }>;
  cumulativeChartData: Array<{ month: string; cumulative: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/admin/analytics");
        if (res.ok) setData(await res.json());
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchAnalytics();
  }, []);

  const overview = data?.overview as AnalyticsData['overview'] || { totalRevenue: 0, totalOwing: 0, totalClients: 0, activeProjects: 0, completedProjects: 0, pendingPayments: 0 };
  const pieData = Object.entries(data?.statusCounts || {}).map(([name, value]) => ({ name: statusLabels[name] || name, value: Number(value) }));
  const clientPieData = Object.entries(data?.clientStatusCounts || {}).map(([name, value]) => ({ name: clientStatusLabels[name] || name, value: Number(value) }));

  return (
    <AdminShell>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">Analytics</h1>
        <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">Business insights and trends</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {[
              { label: "Total Revenue", value: formatCurrency(overview.totalRevenue || 0), icon: TrendingUp, color: "#00e5c3" },
              { label: "Total Owing", value: formatCurrency(overview.totalOwing || 0), icon: CreditCard, color: "#f59e0b" },
              { label: "Clients", value: overview.totalClients || 0, icon: Users, color: "#00f0ff" },
              { label: "Active Projects", value: overview.activeProjects || 0, icon: FolderKanban, color: "#3b82f6" },
              { label: "Completed", value: overview.completedProjects || 0, icon: CheckCircle2, color: "#22c55e" },
              { label: "Pending Payments", value: overview.pendingPayments || 0, icon: Target, color: "#ef4444" },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 sm:p-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${stat.color}10` }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div className="text-xl font-display font-bold text-[#f0f0f5]">{stat.value}</div>
                <div className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
            <div className="card p-4 sm:p-5">
              <h3 className="font-display font-bold text-[#f0f0f5] mb-4 text-sm">Monthly Revenue</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.revenueChartData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#121a2e" />
                  <XAxis dataKey="month" tick={{ fill: "#6b7394", fontSize: 10 }} tickFormatter={(v) => v?.substring(5) || v} />
                  <YAxis tick={{ fill: "#6b7394", fontSize: 10 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="revenue" fill="#00f0ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="font-display font-bold text-[#f0f0f5] mb-4 text-sm">Cumulative Revenue</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data?.cumulativeChartData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#121a2e" />
                  <XAxis dataKey="month" tick={{ fill: "#6b7394", fontSize: 10 }} tickFormatter={(v) => v?.substring(5) || v} />
                  <YAxis tick={{ fill: "#6b7394", fontSize: 10 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="cumulative" name="cumulative" stroke="#3b82f6" fill="#3b82f620" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            <div className="card p-4 sm:p-5">
              <h3 className="font-display font-bold text-[#f0f0f5] mb-4 text-sm">New Clients / Month</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.revenueChartData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#121a2e" />
                  <XAxis dataKey="month" tick={{ fill: "#6b7394", fontSize: 10 }} tickFormatter={(v) => v?.substring(5) || v} />
                  <YAxis tick={{ fill: "#6b7394", fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="clients" name="clients" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="font-display font-bold text-[#f0f0f5] mb-4 text-sm">Project Pipeline</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" nameKey="name">
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {pieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-mono-accent text-[#6b7394]/80">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="font-display font-bold text-[#f0f0f5] mb-4 text-sm">Client Status</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={clientPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" nameKey="name">
                    {clientPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {clientPieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-mono-accent text-[#6b7394]/80">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}