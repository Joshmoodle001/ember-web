"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Plus, Search, Edit2, Trash2, X, Shield, Save, FolderKanban } from "lucide-react";

interface AdminRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  assigned_projects: string[];
}

interface ProjectRecord {
  id: string;
  title: string;
  status: string;
}

interface AdminForm {
  name: string;
  email: string;
  role: string;
  status: string;
  assigned_projects: string[];
}

const roleColors: Record<string, string> = {
  super_admin: "bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/20",
  admin: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  developer: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  designer: "bg-purple-400/10 text-purple-400 border-purple-400/20",
};

const roleOptions = ["super_admin", "admin", "developer", "designer"];
const statusOptions = ["active", "inactive"];

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [form, setForm] = useState<AdminForm>({ name: "", email: "", role: "admin", status: "active", assigned_projects: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [aRes, pRes] = await Promise.all([fetch("/api/admin/admins"), fetch("/api/admin/projects")]);
      if (aRes.ok) { const d = await aRes.json(); setAdmins(d.admins || []); }
      if (pRes.ok) { const d = await pRes.json(); setProjects(d.projects || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = admins.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.role.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingAdmin(null);
    setForm({ name: "", email: "", role: "admin", status: "active", assigned_projects: [] });
    setShowModal(true);
  };

  const openEdit = (admin: AdminRecord) => {
    setEditingAdmin(admin);
    setForm({
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      assigned_projects: admin.assigned_projects || [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingAdmin ? "PATCH" : "POST";
      const body = editingAdmin ? { id: editingAdmin.id, ...form } : form;
      const res = await fetch("/api/admin/admins", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { setShowModal(false); fetchData(); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this admin?")) return;
    try {
      const res = await fetch(`/api/admin/admins?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const toggleProjectAssignment = (projectId: string) => {
    setForm((prev) => ({
      ...prev,
      assigned_projects: prev.assigned_projects.includes(projectId)
        ? prev.assigned_projects.filter((id) => id !== projectId)
        : [...prev.assigned_projects, projectId],
    }));
  };

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">Admins</h1>
          <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">{admins.length} team members</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> Add Admin</button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
        <input type="text" placeholder="Search admins..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center"><Shield className="w-8 h-8 text-[#6b7394]/80 mx-auto mb-3" /><p className="text-[#6b7394]/75 font-mono-accent text-sm">No admins found</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((admin) => {
            const assignedCount = (admin.assigned_projects || []).length;
            return (
              <div key={admin.id} className="card p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#00f0ff]/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-[#00f0ff]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-display font-bold text-[#f0f0f5] truncate">{admin.name}</div>
                      <div className="text-[11px] font-mono-accent text-[#6b7394]/75 truncate">{admin.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded border ${roleColors[admin.role] || roleColors.admin}`}>
                      {admin.role.replace(/_/g, " ")}
                    </span>
                    <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded ${admin.status === "active" ? "bg-emerald-400/10 text-emerald-400" : "bg-[#6b7394]/10 text-[#6b7394]"}`}>
                      {admin.status}
                    </span>
                    {assignedCount > 0 && (
                      <span className="text-[10px] font-mono-accent px-2 py-0.5 rounded bg-[#3b82f6]/10 text-[#3b82f6] flex items-center gap-1">
                        <FolderKanban className="w-3 h-3" /> {assignedCount}
                      </span>
                    )}
                    <button onClick={() => openEdit(admin)} className="p-1.5 text-[#6b7394]/70 hover:text-[#00f0ff] transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(admin.id)} className="p-1.5 text-[#6b7394]/70 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
          <div className="card p-5 sm:p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold text-[#f0f0f5]">{editingAdmin ? "Edit Admin" : "New Admin"}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#6b7394]/70 hover:text-[#6b7394]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Admin name" />
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="admin@emberweb.co.za" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field appearance-none cursor-pointer">
                    {roleOptions.map((r) => <option key={r} value={r} className="bg-[#14141e]">{r.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field appearance-none cursor-pointer">
                    {statusOptions.map((s) => <option key={s} value={s} className="bg-[#14141e]">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-2">Assigned Projects</label>
                <div className="card p-3 max-h-48 overflow-y-auto space-y-1.5">
                  {projects.length === 0 ? (
                    <p className="text-[11px] font-mono-accent text-[#6b7394]/70 py-2 text-center">No projects available</p>
                  ) : (
                    projects.map((p) => (
                      <label key={p.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#00f0ff]/5 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={form.assigned_projects.includes(p.id)}
                          onChange={() => toggleProjectAssignment(p.id)}
                          className="w-3.5 h-3.5 rounded border-[#121a2e] bg-[#0a0e1a] text-[#00f0ff] focus:ring-[#00f0ff]/30 accent-[#00f0ff]"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-display text-[#f0f0f5] truncate">{p.title}</div>
                          <div className="text-[10px] font-mono-accent text-[#6b7394]/70">{p.status.replace(/_/g, " ")}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving || !form.name || !form.email} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : editingAdmin ? "Update Admin" : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}