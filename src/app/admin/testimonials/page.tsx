"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Plus, Search, Edit2, Trash2, X, Star, Save } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
  approved: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  rejected: "bg-red-400/10 text-red-400 border-red-400/20",
  hidden: "bg-[#6b7394]/10 text-[#6b7394] border-[#6b7394]/20",
};

interface Testimonial {
  id: string;
  name: string;
  company: string;
  role: string;
  content: string;
  rating: number;
  featured: boolean;
  status: string;
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", role: "", content: "", rating: 5, featured: false, status: "pending" });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/testimonials");
      if (res.ok) { const d = await res.json(); setTestimonials(d.testimonials || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = testimonials.filter((t) => {
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q) || (t.company || "").toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditingTestimonial(null);
    setForm({ name: "", company: "", role: "", content: "", rating: 5, featured: false, status: "pending" });
    setShowModal(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditingTestimonial(t);
    setForm({ name: t.name, company: t.company || "", role: t.role || "", content: t.content, rating: t.rating, featured: t.featured || false, status: t.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingTestimonial ? "PATCH" : "POST";
      const body = editingTestimonial ? { id: editingTestimonial.id, ...form } : form;
      const res = await fetch("/api/admin/testimonials", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { setShowModal(false); fetchData(); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    try {
      const res = await fetch(`/api/admin/testimonials?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const toggleFeatured = async (t: Testimonial) => {
    await fetch("/api/admin/testimonials", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, featured: !t.featured }) });
    fetchData();
  };

  const approveTestimonial = async (t: Testimonial) => {
    await fetch("/api/admin/testimonials", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, status: "approved" }) });
    fetchData();
  };

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">Testimonials</h1>
          <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">{testimonials.length} total · {testimonials.filter((t) => t.featured).length} featured</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> Add Testimonial</button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
        <input type="text" placeholder="Search testimonials..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center"><Star className="w-8 h-8 text-[#6b7394]/80 mx-auto mb-3" /><p className="text-[#6b7394]/75 font-mono-accent text-sm">No testimonials found</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className="card p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-[#00f0ff]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-display font-bold text-[#00f0ff]">{t.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-display font-bold text-[#f0f0f5] truncate">{t.name}</div>
                      <div className="text-[10px] font-mono-accent text-[#6b7394]/75">{[t.role, t.company].filter(Boolean).join(" at ") || "No company"}</div>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#f0f0f5]/70 line-clamp-2 mt-1">{t.content}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= t.rating ? "text-[#f59e0b] fill-[#f59e0b]" : "text-[#6b7394]/80"}`} />
                    ))}
                  </div>
                  <span className={`text-[9px] font-mono-accent px-1.5 py-0.5 rounded border ${statusColors[t.status] || statusColors.pending}`}>{t.status}</span>
                  {t.featured && <span className="text-[9px] font-mono-accent px-1.5 py-0.5 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">Featured</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                {t.status === "pending" && (
                  <button onClick={() => approveTestimonial(t)} className="text-[10px] font-mono-accent px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors">Approve</button>
                )}
                <button onClick={() => toggleFeatured(t)} className="p-1.5 text-[#6b7394]/70 hover:text-[#f59e0b] transition-colors">{t.featured ? <Star className="w-3.5 h-3.5 fill-[#f59e0b]" /> : <Star className="w-3.5 h-3.5" />}</button>
                <button onClick={() => openEdit(t)} className="p-1.5 text-[#6b7394]/70 hover:text-[#00f0ff] transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 text-[#6b7394]/70 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
          <div className="card p-5 sm:p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold text-[#f0f0f5]">{editingTestimonial ? "Edit Testimonial" : "New Testimonial"}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#6b7394]/70 hover:text-[#6b7394]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Client name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Company</label>
                  <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input-field" placeholder="Company name" />
                </div>
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Role</label>
                  <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field" placeholder="e.g. CEO" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Testimonial *</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-field resize-none" rows={4} placeholder="What they said about working with you..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setForm({ ...form, rating: s })} className="p-1">
                        <Star className={`w-5 h-5 ${s <= form.rating ? "text-[#f59e0b] fill-[#f59e0b]" : "text-[#6b7394]/65"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field appearance-none cursor-pointer">
                    <option value="pending" className="bg-[#14141e]">Pending</option>
                    <option value="approved" className="bg-[#14141e]">Approved</option>
                    <option value="hidden" className="bg-[#14141e]">Hidden</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4 rounded accent-[#00f0ff]" />
                <span className="text-sm text-[#f0f0f5]/80">Featured testimonial (shown on homepage)</span>
              </label>
              <button onClick={handleSave} disabled={saving || !form.name || !form.content} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : editingTestimonial ? "Update Testimonial" : "Create Testimonial"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}