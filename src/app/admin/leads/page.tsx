"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Search, Mail, Building2, MessageSquare, Trash2, ChevronDown, ChevronUp, UserPlus, Filter } from "lucide-react";

const statusColors: Record<string, string> = {
  new: "bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/20",
  contacted: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  qualified: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  proposal: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20",
  won: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  lost: "bg-red-400/10 text-red-400 border-red-400/20",
  spam: "bg-[#6b7394]/10 text-[#6b7394] border-[#6b7394]/20",
};

const budgetLabels: Record<string, string> = {
  "under-10k": "Under R10,000",
  "10k-25k": "R10k – R25k",
  "25k-50k": "R25k – R50k",
  "50k-100k": "R50k – R100k",
  "100k+": "R100k+",
};

const serviceLabels: Record<string, string> = {
  "ai-chatbots": "AI Bots & Chatbots",
  "web-development": "Website Development",
  "e-commerce": "E-Commerce",
  "email-hosting": "Email Hosting",
  "hosting": "Hosting & Infra",
  "seo": "SEO & Performance",
  "design": "UI/UX Design",
  "ai-integration": "AI Integration",
  "maintenance": "Security & Maintenance",
  "custom-app": "Custom Web App",
};

const statusOptions = ["new", "contacted", "qualified", "proposal", "won", "lost", "spam"];

function timeAgo(date: string) {
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
}

interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  service?: string;
  budget?: string;
  message?: string;
  status: string;
  created_at: string;
  client?: Array<{ status: string }>;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/admin/leads");
      if (res.ok) { const d = await res.json(); setLeads(d.leads || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.service?.toLowerCase().includes(q) || l.message?.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new" || !l.status).length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    won: leads.filter((l) => l.status === "won").length,
  };

  const handleStatusChange = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      if (res.ok) { fetchLeads(); }
    } catch (e) { console.error(e); } finally { setUpdating(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    try {
      const res = await fetch(`/api/admin/leads?id=${id}`, { method: "DELETE" });
      if (res.ok) { fetchLeads(); }
    } catch (e) { console.error(e); }
  };

  const handleConvertToClient = async (lead: Lead) => {
    try {
      const res = await fetch("/api/admin/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: lead.name, email: lead.email, company: lead.company || "", status: "lead", notes: `From contact form: ${lead.message?.substring(0, 200) || ""}` }) });
      if (res.ok) {
        await fetch("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, status: "won" }) });
        fetchLeads();
        alert("Lead converted to client!");
      } else {
        const d = await res.json();
        alert(d.error || "Failed to create client. They may already exist.");
      }
    } catch (e) { console.error(e); }
  };

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">Leads</h1>
          <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">{leads.length} total · {stats.new} new · {stats.won} won</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="card p-3 text-center cursor-pointer hover:border-[#00f0ff]/30 transition-colors" onClick={() => setStatusFilter("")}>
          <div className="text-lg font-display font-bold text-[#f0f0f5]">{stats.total}</div>
          <div className="text-[9px] font-mono-accent tracking-wider uppercase text-[#6b7394]/75">All Leads</div>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:border-[#00f0ff]/30 transition-colors" onClick={() => setStatusFilter("new")}>
          <div className="text-lg font-display font-bold text-[#00f0ff]">{stats.new}</div>
          <div className="text-[9px] font-mono-accent tracking-wider uppercase text-[#6b7394]/75">New</div>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:border-[#00f0ff]/30 transition-colors" onClick={() => setStatusFilter("qualified")}>
          <div className="text-lg font-display font-bold text-purple-400">{stats.qualified}</div>
          <div className="text-[9px] font-mono-accent tracking-wider uppercase text-[#6b7394]/75">Qualified</div>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:border-[#00f0ff]/30 transition-colors" onClick={() => setStatusFilter("won")}>
          <div className="text-lg font-display font-bold text-emerald-400">{stats.won}</div>
          <div className="text-[9px] font-mono-accent tracking-wider uppercase text-[#6b7394]/75">Won</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
          <input type="text" placeholder="Search leads by name, email, company, service..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field pl-10 appearance-none cursor-pointer min-w-[140px]">
            <option value="">All statuses</option>
            {statusOptions.map((s) => <option key={s} value={s} className="bg-[#14141e]">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <MessageSquare className="w-8 h-8 text-[#6b7394]/80 mx-auto mb-3" />
          <p className="text-[#6b7394]/75 font-mono-accent text-sm">No leads found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => {
            const isExpanded = expandedId === lead.id;
            const currentStatus = lead.status || "new";
            const statusClass = statusColors[currentStatus] || statusColors.new;
            const existingClient = lead.client?.[0] || null;

            return (
              <div key={lead.id} className="card overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : lead.id)} className="w-full p-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-display font-bold text-[#f0f0f5]">{lead.name || "Unknown"}</span>
                        <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded border ${statusClass}`}>{currentStatus}</span>
                        {existingClient && (
                          <span className="text-[9px] font-mono-accent px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">Client</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] font-mono-accent text-[#6b7394]/75 flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>
                        {lead.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{lead.company}</span>}
                        {lead.service && <span className="text-[#00f0ff]/75">{serviceLabels[lead.service] || lead.service}</span>}
                        {lead.budget && <span className="text-emerald-400/80">{budgetLabels[lead.budget] || lead.budget}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-mono-accent text-[#6b7394]/75">{timeAgo(lead.created_at)}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#6b7394]/70" /> : <ChevronDown className="w-3.5 h-3.5 text-[#6b7394]/70" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[#121a2e] p-4 space-y-4">
                    {lead.message && (
                      <div>
                        <div className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#6b7394]/75 mb-2">Message</div>
                        <div className="bg-[#04060e]/50 rounded-lg p-3 border border-[#121a2e]">
                          <p className="text-sm text-[#e8eaf6]/80 leading-relaxed whitespace-pre-wrap">{lead.message}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#6b7394]/75 mb-1">Service</div>
                        <div className="text-sm text-[#f0f0f5]">{serviceLabels[lead.service || ""] || lead.service || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#6b7394]/75 mb-1">Budget Range</div>
                        <div className="text-sm text-[#f0f0f5]">{budgetLabels[lead.budget || ""] || lead.budget || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#6b7394]/75 mb-1">Submitted</div>
                        <div className="text-sm text-[#f0f0f5]">{new Date(lead.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#6b7394]/75 mb-1">Client Status</div>
                        <div className="text-sm text-[#f0f0f5]">{existingClient ? `Already a client (${existingClient.status})` : "Not yet a client"}</div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#121a2e]">
                      <div className="flex-1">
                        <div className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#6b7394]/75 mb-1.5">Update Status</div>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          disabled={updating === lead.id}
                          className="input-field appearance-none cursor-pointer text-sm"
                        >
                          {statusOptions.map((s) => <option key={s} value={s} className="bg-[#14141e]">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </div>
                      <div className="flex items-end gap-2">
                        {!existingClient && (
                          <button
                            onClick={() => handleConvertToClient(lead)}
                            className="btn-primary text-xs flex items-center gap-1.5"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Convert to Client
                          </button>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="btn-secondary text-xs flex items-center gap-1.5"
                          >
                            <Mail className="w-3.5 h-3.5" /> Email
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="px-3 py-2 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}