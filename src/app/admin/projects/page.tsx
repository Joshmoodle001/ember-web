"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Plus, Search, Edit2, Trash2, X, Save, CheckCircle2, Clock, AlertTriangle, Milestone, LucideIcon } from "lucide-react";

interface StatusConfig {
  color: string;
  icon: LucideIcon;
}

interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string;
  service_type: string;
  status: string;
  priority: string;
  budget: number;
  paid?: number;
  due_date: string;
  notes: string;
  assigned_to: string;
  progress: number;
  client?: { name: string };
  client_message?: string;
}

interface Client {
  id: string;
  name: string;
}

interface Admin {
  id: string;
  name: string;
  role: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: string;
  due_date: string;
  order_num: number;
}

const statusConfig: Record<string, StatusConfig> = {
  inquiry: { color: "bg-purple-400/10 text-purple-400 border-purple-400/20", icon: Clock },
  proposal: { color: "bg-blue-400/10 text-blue-400 border-blue-400/20", icon: Clock },
  deposit: { color: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20", icon: AlertTriangle },
  in_progress: { color: "bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/20", icon: Clock },
  review: { color: "bg-orange-400/10 text-orange-400 border-orange-400/20", icon: Clock },
  delivered: { color: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20", icon: CheckCircle2 },
  completed: { color: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20", icon: CheckCircle2 },
  on_hold: { color: "bg-[#6b7394]/10 text-[#6b7394] border-[#6b7394]/20", icon: AlertTriangle },
  cancelled: { color: "bg-red-400/10 text-red-400 border-red-400/20", icon: AlertTriangle },
};

const projectStatuses = Object.keys(statusConfig);
const priorityOptions = ["low", "medium", "high", "urgent"];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 0 }).format(amount);

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showMilestones, setShowMilestones] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ client_id: "", title: "", description: "", service_type: "", status: "inquiry", priority: "medium", budget: "", due_date: "", notes: "", assigned_to: "", progress: 0, client_message: "" });
  const [saving, setSaving] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneForm, setMilestoneForm] = useState({ title: "", description: "", status: "pending", due_date: "", order_num: 0 });
  const [savingMilestone, setSavingMilestone] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [pRes, cRes, aRes] = await Promise.all([fetch("/api/admin/projects"), fetch("/api/admin/clients"), fetch("/api/admin/admins")]);
      if (pRes.ok) { const d = await pRes.json(); setProjects(d.projects || []); }
      if (cRes.ok) { const d = await cRes.json(); setClients(d.clients || []); }
      if (aRes.ok) { const d = await aRes.json(); setAdmins(d.admins || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchMilestones = async (projectId: string) => {
    try {
      const res = await fetch(`/api/admin/milestones?project_id=${projectId}`);
      if (res.ok) { const d = await res.json(); setMilestones(d.milestones || []); }
    } catch (e) { console.error(e); }
  };

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.service_type?.toLowerCase().includes(search.toLowerCase()) ||
    p.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingProject(null);
    setForm({ client_id: "", title: "", description: "", service_type: "", status: "inquiry", priority: "medium", budget: "", due_date: "", notes: "", assigned_to: "", progress: 0, client_message: "" });
    setShowModal(true);
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setForm({ client_id: p.client_id || "", title: p.title, description: p.description || "", service_type: p.service_type || "", status: p.status, priority: p.priority, budget: p.budget?.toString() || "", due_date: p.due_date ? p.due_date.split("T")[0] : "", notes: p.notes || "", assigned_to: p.assigned_to || "", progress: p.progress || 0, client_message: p.client_message || "" });
    setShowModal(true);
  };

  const openMilestones = (projectId: string) => {
    setShowMilestones(projectId);
    setMilestones([]);
    setMilestoneForm({ title: "", description: "", status: "pending", due_date: "", order_num: 0 });
    fetchMilestones(projectId);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { ...form, budget: form.budget ? Number(form.budget) : 0, progress: Number(form.progress) || 0 };
      const res = await fetch("/api/admin/projects", { method: editingProject ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingProject ? { id: editingProject.id, ...body } : body) });
      if (res.ok) { setShowModal(false); fetchData(); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleAddMilestone = async () => {
    if (!milestoneForm.title || !showMilestones) return;
    setSavingMilestone(true);
    try {
      const body = { project_id: showMilestones, ...milestoneForm, order_num: milestoneForm.order_num || milestones.length };
      const res = await fetch("/api/admin/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { setMilestoneForm({ title: "", description: "", status: "pending", due_date: "", order_num: 0 }); fetchMilestones(showMilestones); }
    } catch (e) { console.error(e); } finally { setSavingMilestone(false); }
  };

  const handleToggleMilestone = async (m: Milestone) => {
    const newStatus = m.status === "completed" ? "pending" : m.status === "in_progress" ? "completed" : "in_progress";
    try {
      await fetch("/api/admin/milestones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null }) });
      fetchMilestones(showMilestones!);
    } catch (e) { console.error(e); }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm("Delete this milestone?")) return;
    try {
      await fetch(`/api/admin/milestones?id=${id}`, { method: "DELETE" });
      fetchMilestones(showMilestones!);
    } catch (e) { console.error(e); }
  };

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">Projects</h1>
          <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">{projects.length} total · {projects.filter(p => ["in_progress", "review", "deposit"].includes(p.status)).length} active</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> New Project</button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
        <input type="text" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center"><p className="text-[#6b7394]/75 font-mono-accent text-sm">No projects found</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const clientName = clients.find((c) => c.id === p.client_id)?.name || p.client?.name || "No client";
            const progress = p.progress || 0;
            return (
              <div key={p.id} className="card p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-display font-bold text-[#f0f0f5] truncate">{p.title}</div>
                      <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded border ${statusConfig[p.status]?.color || statusConfig.inquiry.color}`}>{p.status.replace(/_/g, " ")}</span>
                    </div>
                    <div className="text-[11px] font-mono-accent text-[#6b7394]/75 mt-0.5">{clientName} {p.service_type ? `· ${p.service_type}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openMilestones(p.id)} className="p-1.5 text-[#6b7394]/70 hover:text-[#00f0ff] transition-colors" title="Manage milestones"><Milestone className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openEdit(p)} className="p-1.5 text-[#6b7394]/70 hover:text-[#00f0ff] transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-[11px] font-mono-accent text-[#6b7394]/75">
                      {p.budget > 0 && <span>Budget: {formatCurrency(Number(p.budget))}</span>}
                      {p.budget > 0 && <span>Paid: {formatCurrency(Number(p.paid || 0))}</span>}
                      {p.due_date && <span>Due: {new Date(p.due_date).toLocaleDateString("en-ZA")}</span>}
                    </div>
                    <span className="text-[11px] font-display font-bold" style={{ color: progress >= 100 ? "#10b981" : progress > 50 ? "#00f0ff" : "#6b7394" }}>{progress}%</span>
                  </div>
                  <div className="w-full bg-[#121a2e] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: progress >= 100 ? "linear-gradient(90deg, #10b981, #22c55e)" : progress > 50 ? "linear-gradient(90deg, #00f0ff, #3b82f6)" : "linear-gradient(90deg, #3b82f6, #8b5cf6)" }} />
                  </div>
                </div>

                {p.client_message && (
                  <div className="mt-1 p-2 rounded bg-[#00f0ff]/5 border border-[#00f0ff]/10">
                    <span className="text-[9px] font-mono-accent text-[#00f0ff]/70 tracking-wider uppercase">Client Message: </span>
                    <span className="text-[11px] text-[#f0f0f5]/80">{p.client_message}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
          <div className="card p-5 sm:p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold text-[#f0f0f5]">{editingProject ? "Edit Project" : "New Project"}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#6b7394]/70 hover:text-[#6b7394]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Client</label>
                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input-field appearance-none cursor-pointer">
                  <option value="">No client</option>
                  {clients.map((c) => <option key={c.id} value={c.id} className="bg-[#14141e]">{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Project title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field appearance-none cursor-pointer">
                    {projectStatuses.map((s) => <option key={s} value={s} className="bg-[#14141e]">{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field appearance-none cursor-pointer">
                    {priorityOptions.map((p) => <option key={p} value={p} className="bg-[#14141e]">{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Budget (ZAR)</label>
                  <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="input-field" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Progress: {form.progress}%</label>
                <input type="range" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })} className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#00f0ff]" style={{ background: `linear-gradient(to right, #00f0ff ${form.progress}%, #121a2e ${form.progress}%)` }} />
                <div className="flex justify-between text-[9px] font-mono-accent text-[#6b7394]/65 mt-0.5">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Service Type</label>
                <input type="text" value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="input-field" placeholder="e.g. Website, E-Commerce" />
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows={2} placeholder="Project description..." />
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Client Message <span className="text-[#6b7394]/65">(visible to client)</span></label>
                <textarea value={form.client_message} onChange={(e) => setForm({ ...form, client_message: e.target.value })} className="input-field resize-none" rows={2} placeholder="Message visible to the client on their portal..." />
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Internal Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field resize-none" rows={2} placeholder="Internal notes..." />
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Assigned To</label>
                <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="input-field appearance-none cursor-pointer">
                  <option value="">Unassigned</option>
                  {admins.map((a) => <option key={a.id} value={a.id} className="bg-[#14141e]">{a.name} ({a.role.replace(/_/g, " ")})</option>)}
                </select>
              </div>
              <button onClick={handleSave} disabled={saving || !form.title} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : editingProject ? "Update Project" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestones Modal */}
      {showMilestones && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
          <div className="card p-5 sm:p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-display font-bold text-[#f0f0f5]">Milestones</h2>
                <p className="text-[10px] font-mono-accent text-[#6b7394]/75 mt-0.5">
                  {projects.find((p) => p.id === showMilestones)?.title || "Project"}
                </p>
              </div>
              <button onClick={() => setShowMilestones(null)} className="text-[#6b7394]/70 hover:text-[#6b7394]"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-2 mb-5">
              {milestones.length === 0 ? (
                <p className="text-sm text-[#6b7394]/75 font-mono-accent text-center py-4">No milestones yet. Add one below.</p>
              ) : (
                milestones.map((m) => (
                  <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border ${m.status === "completed" ? "bg-emerald-400/5 border-emerald-400/15" : m.status === "in_progress" ? "bg-[#00f0ff]/5 border-[#00f0ff]/15" : "bg-[#0a0e1a] border-[#121a2e]"}`}>
                    <button onClick={() => handleToggleMilestone(m)} className="flex-shrink-0">
                      {m.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : m.status === "in_progress" ? (
                        <div className="w-4 h-4 rounded-full border-2 border-[#00f0ff] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" /></div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-[#6b7394]/30" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-display ${m.status === "completed" ? "text-emerald-400/80 line-through" : m.status === "in_progress" ? "text-[#00f0ff]" : "text-[#f0f0f5]"}`}>
                        {m.title}
                      </div>
                      {m.description && <p className="text-[10px] text-[#6b7394]/70 line-clamp-1">{m.description}</p>}
                    </div>
                    <button onClick={() => handleDeleteMilestone(m.id)} className="text-[#6b7394]/80 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[#121a2e] pt-4 space-y-3">
              <h3 className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#6b7394]/70">Add Milestone</h3>
              <div>
                <input type="text" value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} className="input-field" placeholder="Milestone title *" />
              </div>
              <div>
                <input type="text" value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} className="input-field" placeholder="Description (optional)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={milestoneForm.status} onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value })} className="input-field appearance-none cursor-pointer">
                  <option value="pending" className="bg-[#14141e]">Pending</option>
                  <option value="in_progress" className="bg-[#14141e]">In Progress</option>
                  <option value="completed" className="bg-[#14141e]">Completed</option>
                </select>
                <input type="date" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })} className="input-field" />
              </div>
              <button onClick={handleAddMilestone} disabled={savingMilestone || !milestoneForm.title} className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus className="w-3.5 h-3.5" /> {savingMilestone ? "Adding..." : "Add Milestone"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}