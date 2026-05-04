"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Search, Clock, User, FolderKanban, CreditCard, Shield, FileText, Star, Filter } from "lucide-react";

import { LucideIcon } from "lucide-react";

const entityIcons: Record<string, LucideIcon> = {
  client: User,
  project: FolderKanban,
  payment: CreditCard,
  admin: Shield,
  invoice: FileText,
  testimonial: Star,
};

const actionColors: Record<string, string> = {
  create: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  update: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  delete: "bg-red-400/10 text-red-400 border-red-400/20",
  status_change: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
  login: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  payment_received: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  file_upload: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
};

interface Activity {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  description: string;
  admin_id?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => { fetchActivity(); }, []);

  const fetchActivity = async () => {
    try {
      const res = await fetch("/api/admin/activity?limit=100");
      if (res.ok) { const d = await res.json(); setActivities(d.activities || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = activities.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || a.description?.toLowerCase().includes(q) || a.action?.toLowerCase().includes(q) || a.entity_type?.toLowerCase().includes(q);
    const matchesFilter = !filter || a.entity_type === filter;
    return matchesSearch && matchesFilter;
  });

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
  };

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">Activity Log</h1>
          <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">Track all changes across the system</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
          <input type="text" placeholder="Search activity..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field pl-10 appearance-none cursor-pointer min-w-[140px]">
            <option value="">All types</option>
            <option value="client">Clients</option>
            <option value="project">Projects</option>
            <option value="payment">Payments</option>
            <option value="admin">Admins</option>
            <option value="invoice">Invoices</option>
            <option value="testimonial">Testimonials</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center"><Clock className="w-8 h-8 text-[#6b7394]/80 mx-auto mb-3" /><p className="text-[#6b7394]/75 font-mono-accent text-sm">No activity recorded yet</p></div>
      ) : (
        <div className="space-y-1">
          {filtered.map((a) => {
            const Icon = entityIcons[a.entity_type] || Clock;
            return (
              <div key={a.id} className="card p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-[#00f0ff]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded border ${actionColors[a.action] || "bg-[#6b7394]/10 text-[#6b7394] border-[#6b7394]/20"}`}>
                      {a.action?.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-mono-accent text-[#6b7394]/70">{a.entity_type}</span>
                  </div>
                  <div className="text-sm text-[#f0f0f5]/80 mt-1 truncate">{a.description || `${a.action} on ${a.entity_type}`}</div>
                  {a.metadata && typeof a.metadata === "object" && (
                    <div className="text-[10px] font-mono-accent text-[#6b7394]/65 mt-0.5 truncate">{JSON.stringify(a.metadata).substring(0, 100)}</div>
                  )}
                </div>
                <div className="text-[10px] font-mono-accent text-[#6b7394]/70 flex-shrink-0">{formatTime(a.created_at)}</div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}