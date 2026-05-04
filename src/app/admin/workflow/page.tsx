"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Plus, X, CheckCircle2, ChevronRight, Save } from "lucide-react";

interface Project {
  id: string;
  name: string;
  title: string;
  description?: string;
  client_id: string;
  status: string;
  value: number;
  budget?: number;
  due_date?: string;
  priority?: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

interface WorkflowStep {
  id: string;
  title: string;
  notes: string;
  status?: string;
  completed_at?: string;
}

const pipelineColumns = [
  { key: "inquiry", label: "Inquiry", color: "border-purple-400/30 bg-purple-400/5", dot: "bg-purple-400" },
  { key: "proposal", label: "Proposal", color: "border-blue-400/30 bg-blue-400/5", dot: "bg-blue-400" },
  { key: "deposit", label: "Deposit", color: "border-[#f59e0b]/30 bg-[#f59e0b]/5", dot: "bg-[#f59e0b]" },
  { key: "in_progress", label: "In Progress", color: "border-[#00f0ff]/30 bg-[#00f0ff]/5", dot: "bg-[#00f0ff]" },
  { key: "review", label: "Review", color: "border-orange-400/30 bg-orange-400/5", dot: "bg-orange-400" },
  { key: "delivered", label: "Delivered", color: "border-emerald-400/30 bg-emerald-400/5", dot: "bg-emerald-400" },
  { key: "completed", label: "Completed", color: "border-emerald-300/30 bg-emerald-300/5", dot: "bg-emerald-300" },
];

const priorityColors: Record<string, string> = {
  low: "text-[#6b7394]/80",
  medium: "text-[#6b7394]",
  high: "text-orange-400",
  urgent: "text-red-400",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 0 }).format(amount);

export default function WorkflowPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [stepForm, setStepForm] = useState({ title: "", notes: "" });
  const [showStepModal, setShowStepModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([fetch("/api/admin/projects"), fetch("/api/admin/clients")]);
      if (pRes.ok) { const d = await pRes.json(); setProjects(d.projects || []); }
      if (cRes.ok) { const d = await cRes.json(); setClients(d.clients || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const openProjectDetail = async (project: Project) => {
    setSelectedProject(project);
    try {
      const res = await fetch(`/api/admin/workflow?project_id=${project.id}`);
      if (res.ok) { const d = await res.json(); setSteps(d.steps || []); }
    } catch (e) { console.error(e); }
  };

  const moveProject = async (projectId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, status: newStatus }),
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const addStep = async () => {
    if (!selectedProject || !stepForm.title) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProject.id,
          title: stepForm.title,
          step_order: steps.length,
          status: "pending",
          notes: stepForm.notes,
        }),
      });
      if (res.ok) {
        setStepForm({ title: "", notes: "" });
        setShowStepModal(false);
        openProjectDetail(selectedProject);
      }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const toggleStep = async (stepId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      const res = await fetch("/api/admin/workflow", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: stepId, status: newStatus }),
      });
      if (res.ok && selectedProject) openProjectDetail(selectedProject);
    } catch (e) { console.error(e); }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || client?.email || "No client";
  };

  const columns = pipelineColumns.map((col) => ({
    ...col,
    projects: projects.filter((p) => p.status === col.key),
  }));

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#f0f0f5]">Workflow</h1>
          <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">Visual project pipeline · Drag status to move projects</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" /></div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 200px)" }}>
          {columns.map((col) => (
            <div key={col.key} className="flex-shrink-0 w-72 sm:w-80">
              <div className={`rounded-xl border ${col.color} p-3 mb-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-xs font-mono-accent tracking-wider uppercase text-[#f0f0f5]/80">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-mono-accent text-[#6b7394]/70 bg-[#04060e]/60 px-2 py-0.5 rounded-full">{col.projects.length}</span>
                </div>
              </div>

              <div className="space-y-2">
                {col.projects.length === 0 ? (
                  <div className="card p-4 opacity-40">
                    <p className="text-[11px] font-mono-accent text-[#6b7394]/70 text-center">No projects</p>
                  </div>
                ) : (
                  col.projects.map((p) => (
                    <div
                      key={p.id}
                      className="card p-3 cursor-pointer hover:!border-[#00f0ff]/30 transition-all"
                      onClick={() => openProjectDetail(p)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <div className="text-sm font-display font-bold text-[#f0f0f5] truncate">{p.title}</div>
                          <div className="text-[10px] font-mono-accent text-[#6b7394]/75 truncate">{getClientName(p.client_id)}</div>
                        </div>
                        <span className={`text-[9px] font-mono-accent px-1.5 py-0.5 rounded ${priorityColors[p.priority || "medium"]}`}>
                          {p.priority}
                        </span>
                      </div>
                      {p.budget && p.budget > 0 && (
                        <div className="text-[10px] font-mono-accent text-[#6b7394]/70 mb-2">
                          {formatCurrency(Number(p.budget))} {p.due_date && `· Due ${new Date(p.due_date).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}`}
                        </div>
                      )}
                      <div className="flex gap-1 mt-1">
                        {col.key !== "inquiry" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); moveProject(p.id, pipelineColumns[pipelineColumns.findIndex((c) => c.key === col.key) - 1]?.key); }}
                            className="text-[9px] font-mono-accent px-1.5 py-0.5 rounded bg-[#0a0e1a] border border-[#121a2e] text-[#6b7394]/80 hover:text-[#00f0ff] hover:border-[#00f0ff]/20 transition-colors"
                          >
                            ← Back
                          </button>
                        )}
                        {col.key !== "completed" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); moveProject(p.id, pipelineColumns[pipelineColumns.findIndex((c) => c.key === col.key) + 1]?.key); }}
                            className="text-[9px] font-mono-accent px-1.5 py-0.5 rounded bg-[#0a0e1a] border border-[#121a2e] text-[#6b7394]/80 hover:text-[#00f0ff] hover:border-[#00f0ff]/20 transition-colors"
                          >
                            Next →
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
          <div className="card p-5 sm:p-6 w-full max-w-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-display font-bold text-[#f0f0f5]">{selectedProject.title}</h2>
                <div className="text-[11px] font-mono-accent text-[#6b7394]/75 mt-0.5">
                  {getClientName(selectedProject.client_id)} · {selectedProject.status.replace(/_/g, " ")}
                </div>
              </div>
              <button onClick={() => setSelectedProject(null)} className="text-[#6b7394]/70 hover:text-[#6b7394]"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
              {pipelineColumns.map((col, i) => {
                const isActive = col.key === selectedProject.status;
                const isPast = pipelineColumns.findIndex((c) => c.key === selectedProject.status) > i;
                return (
                  <div key={col.key} className="flex items-center">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono-accent tracking-wider uppercase whitespace-nowrap ${isActive ? `${col.color} border text-[#f0f0f5]` : isPast ? "bg-emerald-400/5 text-emerald-400/80" : "bg-[#0a0e1a] text-[#6b7394]/65 border border-[#121a2e]"}`}>
                      {(isActive || isPast) && <CheckCircle2 className="w-3 h-3" />}
                      {col.label}
                    </div>
                    {i < pipelineColumns.length - 1 && <ChevronRight className="w-3 h-3 text-[#6b7394]/80 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>

            {selectedProject.description && (
              <div className="mb-4 p-3 rounded-lg bg-[#0a0e1a]/50 border border-[#121a2e]">
                <div className="text-[10px] font-mono-accent text-[#6b7394]/70 tracking-wider uppercase mb-1">Description</div>
                <div className="text-sm text-[#f0f0f5]/80">{selectedProject.description}</div>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-display font-bold text-[#f0f0f5]">Workflow Steps</h3>
              <button onClick={() => setShowStepModal(true)} className="text-[10px] font-mono-accent px-2 py-1 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20 hover:bg-[#00f0ff]/20 transition-colors">
                <Plus className="w-3 h-3 inline mr-1" /> Add Step
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="card p-4 text-center">
                <p className="text-[11px] font-mono-accent text-[#6b7394]/70">No workflow steps yet. Add steps to track progress.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {steps.map((step, i) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      step.status === "completed"
                        ? "bg-emerald-400/5 border-emerald-400/20"
                        : "bg-[#0a0e1a]/50 border-[#121a2e]"
                    }`}
                    onClick={() => toggleStep(step.id, step.status || "pending")}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.status === "completed" ? "bg-emerald-400/20" : "bg-[#121a2e]"
                    }`}>
                      {step.status === "completed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <span className="text-[10px] font-mono-accent text-[#6b7394]/70">{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-display ${step.status === "completed" ? "text-emerald-400/80 line-through" : "text-[#f0f0f5]"}`}>
                        {step.title}
                      </div>
                      {step.notes && <div className="text-[10px] font-mono-accent text-[#6b7394]/70 truncate">{step.notes}</div>}
                    </div>
                    {step.completed_at && (
                      <div className="text-[9px] font-mono-accent text-emerald-400/40 flex-shrink-0">
                        {new Date(step.completed_at).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showStepModal && (
              <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                <div className="card p-5 w-full max-w-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-display font-bold text-[#f0f0f5]">Add Workflow Step</h3>
                    <button onClick={() => setShowStepModal(false)} className="text-[#6b7394]/70 hover:text-[#6b7394]"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Title *</label>
                      <input type="text" value={stepForm.title} onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })} className="input-field" placeholder="e.g. Design mockups sent" />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Notes</label>
                      <textarea value={stepForm.notes} onChange={(e) => setStepForm({ ...stepForm, notes: e.target.value })} className="input-field resize-none" rows={2} placeholder="Optional notes..." />
                    </div>
                    <button onClick={addStep} disabled={saving || !stepForm.title} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-xs">
                      <Save className="w-3.5 h-3.5" /> {saving ? "Adding..." : "Add Step"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}