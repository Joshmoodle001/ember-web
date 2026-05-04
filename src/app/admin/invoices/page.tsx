"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Plus, Search, X, Save, Trash2, FileText } from "lucide-react";

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Invoice {
  id: string;
  client_id: string;
  project_id: string;
  invoice_number: string;
  due_date: string;
  notes: string;
  status: string;
  total: number;
  items: InvoiceItem[];
  client?: { name: string };
  project?: { title: string };
}

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
}

interface Project {
  id: string;
  name: string;
  title: string;
  client_id: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-[#6b7394]/10 text-[#6b7394] border-[#6b7394]/20",
  sent: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  paid: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  overdue: "bg-red-400/10 text-red-400 border-red-400/20",
  cancelled: "bg-[#6b7394]/10 text-[#6b7394]/80 border-[#6b7394]/20",
};

const statusOptions = ["draft", "sent", "paid", "overdue", "cancelled"];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 }).format(amount);

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    project_id: "",
    due_date: "",
    notes: "",
    status: "draft",
    items: [{ description: "", quantity: 1, unit_price: 0 }],
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [iRes, cRes, pRes] = await Promise.all([fetch("/api/admin/invoices"), fetch("/api/admin/clients"), fetch("/api/admin/projects")]);
      if (iRes.ok) { const d = await iRes.json(); setInvoices(d.invoices || []); }
      if (cRes.ok) { const d = await cRes.json(); setClients(d.clients || []); }
      if (pRes.ok) { const d = await pRes.json(); setProjects(d.projects || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return inv.invoice_number?.toLowerCase().includes(q) || inv.client?.name?.toLowerCase().includes(q) || inv.status.includes(q);
  });

  const openCreate = () => {
    setEditingInvoice(null);
    setForm({ client_id: "", project_id: "", due_date: "", notes: "", status: "draft", items: [{ description: "", quantity: 1, unit_price: 0 }] });
    setShowModal(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setForm({
      client_id: inv.client_id || "",
      project_id: inv.project_id || "",
      due_date: inv.due_date ? inv.due_date.split("T")[0] : "",
      notes: inv.notes || "",
      status: inv.status,
      items: inv.items?.length ? inv.items : [{ description: "", quantity: 1, unit_price: 0 }],
    });
    setShowModal(true);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: "", quantity: 1, unit_price: 0 }] });
  const removeItem = (index: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== index) });

  const subtotal = form.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingInvoice ? "PATCH" : "POST";
      const body = editingInvoice
        ? { id: editingInvoice.id, client_id: form.client_id, project_id: form.project_id || null, items: form.items, due_date: form.due_date || null, notes: form.notes, status: form.status }
        : { client_id: form.client_id, project_id: form.project_id || null, items: form.items, due_date: form.due_date || null, notes: form.notes, status: form.status };
      const res = await fetch("/api/admin/invoices", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { setShowModal(false); fetchData(); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    try {
      const res = await fetch(`/api/admin/invoices?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">Invoices</h1>
          <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">{invoices.length} total · ZAR with 15% VAT</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> New Invoice</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="card p-4">
          <div className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Total Invoiced</div>
          <div className="text-xl font-display font-bold text-[#f0f0f5] mt-1">{formatCurrency(invoices.reduce((s, i) => s + Number(i.total || 0), 0))}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Paid</div>
          <div className="text-xl font-display font-bold text-emerald-400 mt-1">{formatCurrency(invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total || 0), 0))}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Outstanding</div>
          <div className="text-xl font-display font-bold text-[#f59e0b] mt-1">{formatCurrency(invoices.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i.total || 0), 0))}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Drafts</div>
          <div className="text-xl font-display font-bold text-[#6b7394] mt-1">{invoices.filter((i) => i.status === "draft").length}</div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
        <input type="text" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center"><FileText className="w-8 h-8 text-[#6b7394]/80 mx-auto mb-3" /><p className="text-[#6b7394]/75 font-mono-accent text-sm">No invoices found</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <div key={inv.id} className="card p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-sm font-display font-bold text-[#f0f0f5]">{inv.invoice_number}</div>
                  <div className="text-[11px] font-mono-accent text-[#6b7394]/75">{inv.client?.name || "Unknown client"}{inv.project?.title ? ` · ${inv.project.title}` : ""}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded border ${statusColors[inv.status] || statusColors.draft}`}>{inv.status}</span>
                  <button onClick={() => openEdit(inv)} className="p-1.5 text-[#6b7394]/70 hover:text-[#00f0ff] transition-colors"><FileText className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(inv.id)} className="p-1.5 text-[#6b7394]/70 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono-accent text-[#6b7394]/75">
                <span className="font-bold text-[#f0f0f5]">{formatCurrency(Number(inv.total || 0))}</span>
                {inv.due_date && <span>Due: {new Date(inv.due_date).toLocaleDateString("en-ZA")}</span>}
                <span>{(inv.items || []).length} item{(inv.items || []).length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
          <div className="card p-5 sm:p-6 w-full max-w-xl my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold text-[#f0f0f5]">{editingInvoice ? "Edit Invoice" : "New Invoice"}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#6b7394]/70 hover:text-[#6b7394]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Client *</label>
                  <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input-field appearance-none cursor-pointer">
                    <option value="">Select client</option>
                    {clients.map((c) => <option key={c.id} value={c.id} className="bg-[#14141e]">{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Project</label>
                  <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className="input-field appearance-none cursor-pointer">
                    <option value="">No project</option>
                    {projects.map((p) => <option key={p.id} value={p.id} className="bg-[#14141e]">{p.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field appearance-none cursor-pointer">
                    {statusOptions.map((s) => <option key={s} value={s} className="bg-[#14141e]">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input-field" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75">Line Items</label>
                  <button onClick={addItem} className="text-[10px] font-mono-accent text-[#00f0ff] hover:text-[#00f0ff]/80">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="input-field flex-1" placeholder="Description" />
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className="input-field w-16 text-center" min="1" />
                      <input type="number" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} className="input-field w-28" placeholder="Price" min="0" step="0.01" />
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="p-1.5 text-[#6b7394]/70 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-glow p-3 space-y-1">
                <div className="flex justify-between text-[11px] font-mono-accent text-[#6b7394]/80">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono-accent text-[#6b7394]/80">
                  <span>VAT (15%)</span><span>{formatCurrency(vat)}</span>
                </div>
                <div className="flex justify-between text-sm font-display font-bold text-[#f0f0f5] pt-1 border-t border-[#121a2e]">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field resize-none" rows={2} placeholder="Payment terms, notes..." />
              </div>

              <button onClick={handleSave} disabled={saving || !form.client_id} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : editingInvoice ? "Update Invoice" : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}