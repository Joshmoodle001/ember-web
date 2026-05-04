"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Plus, Search, Edit2, Trash2, X, User, Mail, Phone, Building2, Save, Link } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  status: string;
  notes: string;
  created_at: string;
  access_token?: string;
}

const statusColors: Record<string, string> = {
  lead: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  active: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  inactive: "bg-[#6b7394]/10 text-[#6b7394] border-[#6b7394]/20",
  archived: "bg-red-400/10 text-red-400 border-red-400/20",
};

const statusOptions = ["lead", "active", "inactive", "archived"];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", status: "lead", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) { const data = await res.json(); setClients(data.clients || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingClient(null);
    setForm({ name: "", email: "", company: "", phone: "", status: "lead", notes: "" });
    setShowModal(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({ name: client.name, email: client.email, company: client.company || "", phone: client.phone || "", status: client.status, notes: client.notes || "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const endpoint = editingClient ? "/api/admin/clients" : "/api/admin/clients";
      const method = editingClient ? "PATCH" : "POST";
      const body = editingClient ? { id: editingClient.id, ...form } : form;
      const res = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { setShowModal(false); fetchClients(); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this client?")) return;
    try {
      const res = await fetch(`/api/admin/clients?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchClients();
    } catch (e) { console.error(e); }
  };

  const copyPortalLink = (client: Client) => {
    const token = client.access_token;
    if (!token) { alert("No portal access token. Update the client to generate one."); return; }
    const url = `${window.location.origin}/portal/login`;
    navigator.clipboard.writeText(url);
  };

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">Clients</h1>
          <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">{clients.length} total</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-xs">
          <Plus className="w-3.5 h-3.5" /> Add Client
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
        <input type="text" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center"><p className="text-[#6b7394]/75 font-mono-accent text-sm">No clients found</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <div key={client.id} className="card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#00f0ff]/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#00f0ff]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-display font-bold text-[#f0f0f5] truncate">{client.name}</div>
                  <div className="text-[11px] font-mono-accent text-[#6b7394]/75 truncate">{client.email}{client.company ? ` · ${client.company}` : ""}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded border ${statusColors[client.status] || statusColors.lead}`}>{client.status}</span>
                <button onClick={() => openEdit(client)} className="p-1.5 text-[#6b7394]/70 hover:text-[#00f0ff] transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => copyPortalLink(client)} className="p-1.5 text-[#6b7394]/70 hover:text-[#00e5c3] transition-colors" title="Copy portal link"><Link className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(client.id)} className="p-1.5 text-[#6b7394]/70 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="card p-5 sm:p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold text-[#f0f0f5]">{editingClient ? "Edit Client" : "New Client"}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#6b7394]/70 hover:text-[#6b7394]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Name *</label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/65" /><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field pl-10" placeholder="John Doe" /></div>
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Email *</label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/65" /><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field pl-10" placeholder="john@example.com" /></div>
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Company</label>
                <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/65" /><input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input-field pl-10" placeholder="Company name" /></div>
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Phone</label>
                <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/65" /><input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field pl-10" placeholder="+27..." /></div>
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field appearance-none cursor-pointer">
                  {statusOptions.map((s) => <option key={s} value={s} className="bg-[#14141e]">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field resize-none" rows={3} placeholder="Notes about this client..." />
              </div>
              <button onClick={handleSave} disabled={saving || !form.name || !form.email} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : editingClient ? "Update Client" : "Create Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}