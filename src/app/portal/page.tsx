"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Cpu, FolderKanban, CreditCard, FileText, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, Calendar, DollarSign, LogOut, BarChart3, LucideIcon } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: LucideIcon; order: number }> = {
  inquiry: { label: "Inquiry", color: "text-purple-400 bg-purple-400/10 border-purple-400/20", icon: Clock, order: 0 },
  proposal: { label: "Proposal", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: Clock, order: 1 },
  deposit: { label: "Deposit", color: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20", icon: AlertTriangle, order: 2 },
  in_progress: { label: "In Progress", color: "text-[#00f0ff] bg-[#00f0ff]/10 border-[#00f0ff]/20", icon: Clock, order: 3 },
  review: { label: "Review", color: "text-orange-400 bg-orange-400/10 border-orange-400/20", icon: Clock, order: 4 },
  delivered: { label: "Delivered", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2, order: 5 },
  completed: { label: "Completed", color: "text-emerald-300 bg-emerald-300/10 border-emerald-300/20", icon: CheckCircle2, order: 6 },
  on_hold: { label: "On Hold", color: "text-[#6b7394] bg-[#6b7394]/10 border-[#6b7394]/20", icon: AlertTriangle, order: 7 },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: AlertTriangle, order: 8 },
};

const paymentStatusColors: Record<string, string> = {
  pending: "text-[#f59e0b] bg-[#f59e0b]/10",
  complete: "text-emerald-400 bg-emerald-400/10",
  failed: "text-red-400 bg-red-400/10",
};

const invoiceStatusColors: Record<string, string> = {
  draft: "text-[#6b7394] bg-[#6b7394]/10",
  sent: "text-blue-400 bg-blue-400/10",
  paid: "text-emerald-400 bg-emerald-400/10",
  overdue: "text-red-400 bg-red-400/10",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 0 }).format(amount);

const pipelineStages = ["inquiry", "proposal", "deposit", "in_progress", "review", "delivered", "completed"];

const milestoneStatusColors: Record<string, string> = {
  completed: "bg-emerald-400/10 border-emerald-400/30 text-emerald-400",
  in_progress: "bg-[#00f0ff]/10 border-[#00f0ff]/30 text-[#00f0ff]",
  pending: "bg-[#121a2e] border-[#121a2e] text-[#6b7394]/75",
};

interface Milestone {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
}

function MilestoneTimeline({ milestones, projectStatus }: { milestones: Milestone[]; projectStatus: string }) {
  pipelineStages.indexOf(projectStatus);

  return (
    <div className="space-y-2">
      {milestones.map((m, i: number) => {
        const isCompleted = m.status === "completed";
        const isCurrent = m.status === "in_progress";
        return (
          <div key={m.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[9px] ${milestoneStatusColors[m.status] || milestoneStatusColors.pending}`}>
                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : isCurrent ? <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" /> : <span className="font-mono-accent">{i + 1}</span>}
              </div>
              {i < milestones.length - 1 && <div className={`w-px h-4 ${isCompleted ? "bg-emerald-400/20" : "bg-[#121a2e]"}`} />}
            </div>
            <div className="min-w-0 pb-1">
              <div className={`text-[11px] font-display font-bold ${isCompleted ? "text-emerald-400/80" : isCurrent ? "text-[#00f0ff]" : "text-[#6b7394]/75"}`}>
                {m.title}
              </div>
              {m.description && <p className="text-[10px] text-[#6b7394]/70 line-clamp-2">{m.description}</p>}
              {m.due_date && <span className="text-[9px] font-mono-accent text-[#6b7394]/65">Due: {new Date(m.due_date).toLocaleDateString("en-ZA")}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ProjectData {
  id: string;
  title: string;
  description?: string;
  service_type?: string;
  status: string;
  progress: number;
  budget?: number;
  paid?: number;
  due_date?: string;
  client_message?: string;
  milestones?: Milestone[];
}

function ProjectCard({ project }: { project: ProjectData }) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[project.status] || statusConfig.inquiry;
  const progress = project.progress ?? 0;
  const budgetProgress = (project.budget ?? 0) > 0 ? Math.min(100, Math.round((Number(project.paid || 0) / Number(project.budget ?? 1)) * 100)) : 0;
  const milestones = project.milestones || [];
  const completedMilestones = milestones.filter((m) => m.status === "completed").length;
  const milestoneProgress = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;
  const overallProgress = milestones.length > 0 ? milestoneProgress : progress;

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 sm:p-5 text-left">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h3 className="text-base font-display font-bold text-[#f0f0f5]">{project.title}</h3>
            {project.service_type && <p className="text-[11px] font-mono-accent text-[#6b7394]/75">{project.service_type}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded border ${config.color}`}>{config.label}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-[#6b7394]/70" /> : <ChevronDown className="w-3.5 h-3.5 text-[#6b7394]/70" />}
          </div>
        </div>

        {project.description && <p className="text-sm text-[#f0f0f5]/80 mb-3 line-clamp-2">{project.description}</p>}

        {/* Overall Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Overall Progress</span>
            <span className="text-[11px] font-display font-bold" style={{ color: overallProgress >= 100 ? "#10b981" : overallProgress > 50 ? "#00f0ff" : "#6b7394" }}>
              {overallProgress}%
            </span>
          </div>
          <div className="w-full bg-[#121a2e] rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{
                background: overallProgress >= 100
                  ? "linear-gradient(90deg, #10b981, #22c55e)"
                  : overallProgress > 50
                    ? "linear-gradient(90deg, #00f0ff, #3b82f6)"
                    : "linear-gradient(90deg, #3b82f6, #8b5cf6)",
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono-accent text-[#6b7394]/75 flex-wrap">
          {(project.budget ?? 0) > 0 && (
            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatCurrency(Number(project.budget ?? 0))}</span>
          )}
          {Number(project.paid) > 0 && (
            <span className="flex items-center gap-1 text-emerald-400/70"><CheckCircle2 className="w-3 h-3" />{formatCurrency(Number(project.paid))} paid</span>
          )}
          {project.due_date && (
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(project.due_date).toLocaleDateString("en-ZA")}</span>
          )}
          {milestones.length > 0 && (
            <span className="flex items-center gap-1 text-[#00f0ff]/75"><BarChart3 className="w-3 h-3" />{completedMilestones}/{milestones.length} milestones</span>
          )}
        </div>

        {project.client_message && (
          <div className="mt-3 p-2.5 rounded-lg bg-[#00f0ff]/5 border border-[#00f0ff]/10">
            <p className="text-[10px] font-mono-accent text-[#00f0ff]/70 tracking-wider uppercase mb-0.5">Note from Ember</p>
            <p className="text-[12px] text-[#f0f0f5]/70">{project.client_message}</p>
          </div>
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="border-t border-[#121a2e]"
        >
          <div className="p-4 sm:p-5 pt-4 space-y-4">
            {/* Pipeline Stage Bar */}
            <div>
              <h4 className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#6b7394]/70 mb-3">Project Status</h4>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {pipelineStages.map((stage, i) => {
                  const stageIdx = pipelineStages.indexOf(project.status);
                  const isCompleted = i <= stageIdx && !["on_hold", "cancelled"].includes(project.status);
                  const isCurrent = stage === project.status;
                  const stageConf = statusConfig[stage];
                  return (
                    <div key={stage} className="flex items-center flex-shrink-0">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono-accent tracking-wider uppercase whitespace-nowrap ${
                        isCurrent ? `${stageConf.color} border` : isCompleted ? "bg-emerald-400/5 border border-emerald-400/20 text-emerald-400/80" : "bg-[#0a0e1a] text-[#6b7394]/80 border border-[#121a2e]"
                      }`}>
                        {(isCompleted || isCurrent) && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {stageConf.label}
                      </div>
                      {i < pipelineStages.length - 1 && <div className="w-3 h-px bg-[#121a2e] mx-0.5" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Budget Progress */}
{(project.budget ?? 0) > 0 && (
              <div>
                <h4 className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#6b7394]/70 mb-2">Budget</h4>
                <div className="flex items-center gap-3 text-[11px] font-mono-accent">
                  <span className="text-[#f0f0f5]/80">{formatCurrency(Number(project.paid || 0))}</span>
                  <div className="flex-1 bg-[#121a2e] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${budgetProgress}%`, background: budgetProgress >= 100 ? "#10b981" : "linear-gradient(90deg, #00f0ff, #3b82f6)" }} />
                  </div>
                  <span className="text-[#6b7394]/70">{formatCurrency(Number(project.budget))}</span>
                </div>
              </div>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <div>
                <h4 className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#6b7394]/70 mb-3">Milestones</h4>
                <MilestoneTimeline milestones={milestones} projectStatus={project.status} />
              </div>
            )}

            {milestones.length === 0 && (
              <p className="text-[11px] text-[#6b7394]/65 font-mono-accent text-center py-2">Milestones will appear here once your project begins.</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

interface PaymentData {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  due_date?: string;
}

interface PortalData {
  client: { name: string; company?: string; token?: string };
  projects: ProjectData[];
  payments: PaymentData[];
  invoices: InvoiceData[];
}

function ClientPortalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"projects" | "payments" | "invoices">("projects");

  useEffect(() => {
    const savedToken = token || localStorage.getItem("portal_token");
    if (!savedToken) {
      router.push("/portal/login");
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/portal?token=${savedToken}`);
        if (res.ok) {
          const d = await res.json();
          setData(d);
          if (d.client?.token) localStorage.setItem("portal_token", d.client.token);
        } else {
          const d = await res.json();
          setError(d.error || "Failed to load");
          if (res.status === 404 || res.status === 403) {
            localStorage.removeItem("portal_token");
          }
        }
      } catch {
        setError("Failed to connect");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, router]);

  const handleLogout = () => {
    localStorage.removeItem("portal_token");
    router.push("/portal/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04060e] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#04060e] flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-[#f59e0b] mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold text-[#f0f0f5] mb-2">Access Denied</h1>
          <p className="text-[#6b7394]/80 font-mono-accent text-sm mb-4">{error || "Invalid access link"}</p>
          <a href="/portal/login" className="btn-primary text-sm">Go to Login</a>
        </div>
      </div>
    );
  }

  const totalPaid = data.payments?.filter((p) => p.status === "complete").reduce((s, p) => s + Number(p.amount), 0) || 0;
  const totalOwing = data.invoices?.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.total), 0) || 0;
  const activeProjects = data.projects?.filter((p) => !["completed", "cancelled"].includes(p.status)).length || 0;

  const tabs = [
    { id: "projects" as const, label: "Projects", icon: FolderKanban, count: data.projects?.length || 0 },
    { id: "payments" as const, label: "Payments", icon: CreditCard, count: data.payments?.length || 0 },
    { id: "invoices" as const, label: "Invoices", icon: FileText, count: data.invoices?.length || 0 },
  ];

  return (
    <div className="min-h-screen bg-[#04060e]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#04060e]/90 backdrop-blur-xl border-b border-[#121a2e]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00f0ff] to-[#3b82f6] flex items-center justify-center">
              <Cpu className="w-4.5 h-4.5 text-[#04060e]" />
            </div>
            <div>
              <div className="text-sm font-display font-bold text-gradient">EMBER</div>
              <div className="text-[8px] font-mono-accent text-[#6b7394]/70 tracking-wider">CLIENT PORTAL</div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-[11px] font-mono-accent text-[#6b7394]/75 hover:text-red-400 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-[#f0f0f5]">Welcome, {data.client.name}</h1>
          {data.client.company && <p className="text-sm text-[#6b7394]/80 font-mono-accent mt-1">{data.client.company}</p>}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-display font-bold text-[#00f0ff]">{activeProjects}</div>
            <div className="text-[9px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Active</div>
          </div>
          <div className="card p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-display font-bold text-emerald-400">{formatCurrency(totalPaid)}</div>
            <div className="text-[9px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Paid</div>
          </div>
          <div className="card p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-display font-bold text-[#f59e0b]">{formatCurrency(totalOwing)}</div>
            <div className="text-[9px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">Owing</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#0a0e1a] p-1 rounded-lg border border-[#121a2e]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-[11px] font-mono-accent tracking-wider transition-all ${
                activeTab === tab.id
                  ? "bg-[#121a2e] text-[#00f0ff] border border-[#00f0ff]/20"
                  : "text-[#6b7394]/75 hover:text-[#6b7394]"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && <span className={`text-[9px] ${activeTab === tab.id ? "text-[#00f0ff]/80" : "text-[#6b7394]/65"}`}>({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            {data.projects.length === 0 ? (
              <div className="card p-6 text-center">
                <FolderKanban className="w-8 h-8 text-[#6b7394]/80 mx-auto mb-3" />
                <p className="text-[#6b7394]/75 font-mono-accent text-sm">No projects yet</p>
                <p className="text-[11px] text-[#6b7394]/65 mt-1">Projects will appear here once they&apos;re created</p>
              </div>
            ) : (
              data.projects.map((p) => <ProjectCard key={p.id} project={p} />)
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-2">
            {data.payments.length === 0 ? (
              <div className="card p-6 text-center">
                <CreditCard className="w-8 h-8 text-[#6b7394]/80 mx-auto mb-3" />
                <p className="text-[#6b7394]/75 font-mono-accent text-sm">No payments yet</p>
              </div>
            ) : (
              data.payments.map((p) => (
                <div key={p.id} className="card p-3 sm:p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-display font-bold text-[#f0f0f5]">{formatCurrency(Number(p.amount))}</div>
                    <div className="text-[10px] font-mono-accent text-[#6b7394]/70">{new Date(p.created_at).toLocaleDateString("en-ZA")}</div>
                  </div>
                  <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded ${paymentStatusColors[p.status] || "text-[#6b7394] bg-[#6b7394]/10"}`}>{p.status}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="space-y-2">
            {data.invoices.length === 0 ? (
              <div className="card p-6 text-center">
                <FileText className="w-8 h-8 text-[#6b7394]/80 mx-auto mb-3" />
                <p className="text-[#6b7394]/75 font-mono-accent text-sm">No invoices yet</p>
              </div>
            ) : (
              data.invoices.map((inv) => (
                <div key={inv.id} className="card p-3 sm:p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-display font-bold text-[#f0f0f5]">{inv.invoice_number}</div>
                    <div className="text-[10px] font-mono-accent text-[#6b7394]/70">
                      {formatCurrency(Number(inv.total))}{inv.due_date ? ` · Due ${new Date(inv.due_date).toLocaleDateString("en-ZA")}` : ""}
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono-accent px-2 py-0.5 rounded ${invoiceStatusColors[inv.status] || "text-[#6b7394] bg-[#6b7394]/10"}`}>{inv.status}</span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-12 pb-8 text-center">
          <p className="text-[10px] font-mono-accent text-[#6b7394]/65">Ember Web · Client Portal · {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}

export default function PortalPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#04060e] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" /></div>}>
      <ClientPortalPage />
    </Suspense>
  );
}