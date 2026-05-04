"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CreditCard, Plus, Search, X, RefreshCw } from "lucide-react";

interface Payment {
  id: string;
  client_id: string;
  project_id: string;
  amount: number;
  status: string;
  notes: string;
  created_at: string;
  payfast_payment_id?: string;
  client?: { name: string };
  project?: { name: string; title: string };
}

interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

interface Project {
  id: string;
  name: string;
  title: string;
  client_id?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 0 }).format(amount);

const statusColors: Record<string, string> = {
  pending: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
  processing: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  complete: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  failed: "bg-red-400/10 text-red-400 border-red-400/20",
  refunded: "bg-purple-400/10 text-purple-400 border-purple-400/20",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ client_id: "", project_id: "", amount: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, cliRes, proRes] = await Promise.all([
        fetch("/api/admin/payments"),
        fetch("/api/admin/clients"),
        fetch("/api/admin/projects"),
      ]);
      if (payRes.ok) { const d = await payRes.json(); setPayments(d.payments || []); }
      if (cliRes.ok) { const d = await cliRes.json(); setClients(d.clients || []); }
      if (proRes.ok) { const d = await proRes.json(); setProjects(d.projects || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.client?.name?.toLowerCase().includes(q) ||
      p.project?.title?.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q) ||
      String(p.amount).includes(q)
    );
  });

  const totalRevenue = payments.filter((p) => p.status === "complete").reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);
  const pendingTotal = payments.filter((p) => p.status === "pending").reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);

  const handleCreatePayment = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: form.client_id || null,
          project_id: form.project_id || null,
          amount: Number(form.amount),
          notes: form.notes,
        }),
      });
      if (res.ok) {
        const payment = await res.json();
        setShowModal(false);

        const client = clients.find((c) => c.id === form.client_id);
        const project = projects.find((p) => p.id === form.project_id);

        if (client) {
          const pfRes = await fetch("/api/payfast/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientName: client.name,
              clientEmail: client.email,
              amount: Number(form.amount),
              itemName: project?.title || "Ember Web Services",
              itemDescription: form.notes || undefined,
              projectId: form.project_id || undefined,
              paymentId: payment.payment.id,
            }),
          });

          if (pfRes.ok) {
            const pfData = await pfRes.json();
            const formEl = document.createElement("form");
            formEl.method = "POST";
            formEl.action = pfData.url;
            Object.entries(pfData.data).forEach(([key, value]) => {
              if (value !== undefined) {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = String(value);
                formEl.appendChild(input);
              }
            });
            document.body.appendChild(formEl);
            formEl.submit();
          } else {
            alert("Payment record created but PayFast checkout could not be generated. Check your PayFast configuration.");
          }
        }
        fetchData();
      }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleMarkPaid = async (id: string) => {
    await fetch("/api/admin/payments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "complete" }) });
    fetchData();
  };

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">Payments</h1>
          <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">{payments.length} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <button onClick={() => { setForm({ client_id: "", project_id: "", amount: "", notes: "" }); setShowModal(true); }} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> New Payment</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="card p-4">
          <div className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Total Revenue</div>
          <div className="text-xl font-display font-bold text-emerald-400 mt-1">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Pending</div>
          <div className="text-xl font-display font-bold text-[#f59e0b] mt-1">{formatCurrency(pendingTotal)}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Completed</div>
          <div className="text-xl font-display font-bold text-[#f0f0f5] mt-1">{payments.filter((p) => p.status === "complete").length}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Failed</div>
          <div className="text-xl font-display font-bold text-red-400 mt-1">{payments.filter((p) => p.status === "failed").length}</div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
        <input type="text" placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center"><CreditCard className="w-8 h-8 text-[#6b7394]/80 mx-auto mb-3" /><p className="text-[#6b7394]/75 font-mono-accent text-sm">No payments found</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="card p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-sm font-display font-bold text-[#f0f0f5]">{formatCurrency(Number(p.amount))}</div>
                  <div className="text-[11px] font-mono-accent text-[#6b7394]/75">
                    {p.client?.name || "Unknown"} {p.project?.title ? `· ${p.project.title}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded border ${statusColors[p.status] || statusColors.pending}`}>
                    {p.status}
                  </span>
                  {p.status === "pending" && (
                    <button onClick={() => handleMarkPaid(p.id)} className="text-[10px] font-mono-accent px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors">
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono-accent text-[#6b7394]/70">
                <span>{new Date(p.created_at).toLocaleDateString("en-ZA")}</span>
                {p.payfast_payment_id && <span>PF: {p.payfast_payment_id.substring(0, 12)}...</span>}
                {p.notes && <span className="truncate">{p.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
          <div className="card p-5 sm:p-6 w-full max-w-md my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold text-[#f0f0f5]">New Payment</h2>
              <button onClick={() => setShowModal(false)} className="text-[#6b7394]/70 hover:text-[#6b7394]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Client</label>
                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input-field appearance-none cursor-pointer">
                  <option value="">Select client</option>
                  {clients.map((c) => <option key={c.id} value={c.id} className="bg-[#14141e]">{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Project</label>
                <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className="input-field appearance-none cursor-pointer">
                  <option value="">Select project</option>
                  {projects.map((p) => <option key={p.id} value={p.id} className="bg-[#14141e]">{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Amount (ZAR) *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" placeholder="0" min="0" step="0.01" />
              </div>
              <div>
                <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field resize-none" rows={2} placeholder="Payment reference..." />
              </div>

              <div className="card-glow p-3 text-[11px] font-mono-accent text-[#6b7394]/80 space-y-1">
                <div className="flex items-center gap-2 text-[#00f0ff]/70">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="font-bold">PayFast Integration</span>
                </div>
                <p>Creating a payment will generate a PayFast checkout link. The client will be redirected to PayFast to complete payment.</p>
                <p>PayFast ITN (Instant Transaction Notification) will automatically update payment status when completed.</p>
              </div>

              <button onClick={handleCreatePayment} disabled={saving || !form.amount} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                <CreditCard className="w-4 h-4" /> {saving ? "Creating..." : "Create & Send to PayFast"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}