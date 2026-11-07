"use client";

import { FormEvent, useEffect, useState } from "react";

type Client = { id: string; full_name: string; company: string | null };
type Milestone = { id: string; title: string; status: "pending" | "in_progress" | "done"; position: number; due_on: string | null; completed_at: string | null };
type Project = { id: string; client_id: string; title: string; summary: string; status: string; progress: number; due_on: string | null; clients: { full_name: string; company: string | null } | null; milestones: Milestone[] };
type ProjectData = { projects: Project[]; clients: Client[] };
const projectStates = ["not_started", "in_progress", "review", "delivered", "on_hold"];

export default function ProjectsWorkspace() {
  const [data, setData] = useState<ProjectData | null>(null);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [progressDrafts, setProgressDrafts] = useState<Record<string, number>>({});

  async function fetchData(signal?: AbortSignal): Promise<ProjectData> {
    const response = await fetch("/api/admin/projects", { cache: "no-store", signal });
    const result = await response.json() as ProjectData & { error?: string };
    if (!response.ok) throw new Error(result.error || "Projects could not be loaded.");
    return result;
  }

  async function load() {
    setData(await fetchData());
  }

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const initialData = await fetchData(controller.signal);
        if (!controller.signal.aborted) setData(initialData);
      } catch (error) {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Projects could not be loaded.");
      }
    })();
    return () => controller.abort();
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, title, summary, dueOn }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Project could not be created.");
      setTitle(""); setSummary(""); setDueOn("");
      await load();
      setMessage("Project created with a four-step delivery checklist.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Project could not be created."); }
    finally { setBusy(false); }
  }

  async function updateProject(id: string, status: string, progress: number) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, progress }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Project could not be updated.");
      setProgressDrafts((drafts) => {
        const next = { ...drafts };
        delete next[id];
        return next;
      });
      await load(); setMessage("Delivery status updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Project could not be updated."); }
    finally { setBusy(false); }
  }

  async function updateMilestone(id: string, status: Milestone["status"]) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/milestones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Milestone could not be updated.");
      await load(); setMessage("Delivery checklist updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Milestone could not be updated."); }
    finally { setBusy(false); }
  }

  return (
    <div className="workspace-page">
      <div className="page-heading"><div><p className="eyebrow">DELIVERY</p><h1>Projects & handover</h1><p className="muted">Each accepted project starts with the same clear checklist. Update progress as work moves forward.</p></div></div>
      <div className="two-column-layout">
        <section className="panel form-panel-inner"><p className="eyebrow">NEW PROJECT</p><h2>Start delivery</h2>
          {!data?.clients.length ? <p className="empty-state">Create a client record from a Won enquiry before starting delivery.</p> : <form className="form-stack" onSubmit={createProject}>
            <label className="field" htmlFor="project-client">Client<select id="project-client" value={clientId} onChange={(event) => setClientId(event.target.value)} required><option value="">Choose client</option>{data.clients.map((client) => <option value={client.id} key={client.id}>{client.company || client.full_name}</option>)}</select></label>
            <label className="field" htmlFor="project-title">Project name<input id="project-title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={180} /></label>
            <label className="field" htmlFor="project-summary">Delivery notes <span className="muted">(optional)</span><textarea id="project-summary" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={3000} /></label>
            <label className="field" htmlFor="project-due">Target launch <span className="muted">(optional)</span><input id="project-due" type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} /></label>
            <button className="button button-primary" disabled={busy}>Create delivery project</button>
          </form>}
        </section>
        <section className="panel data-panel"><div className="section-heading"><div><p className="eyebrow">ACTIVE WORK</p><h2>Delivery board</h2></div></div>
          {message && <p className="inline-message" aria-live="polite">{message}</p>}
          {!data ? <p className="empty-state">Loading projects…</p> : !data.projects.length ? <p className="empty-state">Projects will appear here after a proposal is accepted.</p> : <div className="project-list">{data.projects.map((project) => <article className="project-card" key={project.id}>
            <div className="project-card-head"><div><p className="eyebrow">{project.clients?.company || project.clients?.full_name}</p><h3>{project.title}</h3></div><span className={`state-${project.status}`}>{project.status.replaceAll("_", " ")}</span></div>
            {project.summary && <p className="muted">{project.summary}</p>}
            <div className="project-progress"><div className="project-row-top"><label htmlFor={`progress-${project.id}`}>Delivery progress</label><strong>{progressDrafts[project.id] ?? project.progress}%</strong></div><input id={`progress-${project.id}`} type="range" min="0" max="100" step="5" value={progressDrafts[project.id] ?? project.progress} disabled={busy} onChange={(event) => setProgressDrafts((drafts) => ({ ...drafts, [project.id]: Number(event.target.value) }))} /><button className="small-button" disabled={busy || progressDrafts[project.id] === undefined || progressDrafts[project.id] === project.progress} onClick={() => void updateProject(project.id, project.status, progressDrafts[project.id] ?? project.progress)}>Save progress</button></div>
            <label className="field compact-field" htmlFor={`status-${project.id}`}>Project stage<select id={`status-${project.id}`} value={project.status} disabled={busy} onChange={(event) => void updateProject(project.id, event.target.value, project.progress)}>{projectStates.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
            <div className="milestone-list"><h4>Delivery checklist</h4>{project.milestones.toSorted((a,b) => a.position - b.position).map((milestone) => <label className="milestone-row" key={milestone.id}><span className={`milestone-dot milestone-${milestone.status}`} aria-hidden="true" /><span>{milestone.title}</span><select aria-label={`Status for ${milestone.title}`} value={milestone.status} disabled={busy} onChange={(event) => void updateMilestone(milestone.id, event.target.value as Milestone["status"])}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>)}</div>
          </article>)}</div>}
        </section>
      </div>
    </div>
  );
}
