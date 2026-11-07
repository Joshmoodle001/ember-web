"use client";

import { useEffect, useRef, useState } from "react";
import type { ResearchJob } from "@/lib/website-research";
import { researchErrorMessages } from "@/lib/website-research";

type Props = {
  prospectId: string | null;
  businessName: string;
  website: string;
  updatedAt?: string;
  unsavedChanges?: boolean;
  doNotContact?: boolean;
  parentBusy?: boolean;
};

function safeSource(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port || !host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || /^[\d.]+$/.test(host) || host.includes(":")) return null;
    return url.href;
  } catch { return null; }
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(date);
}

async function loadJobs(signal: AbortSignal): Promise<ResearchJob[]> {
  const response = await fetch("/api/admin/outreach/research", { cache: "no-store", signal });
  const body = await response.json() as { jobs?: ResearchJob[]; error?: string };
  if (!response.ok || !Array.isArray(body.jobs)) throw new Error(body.error || "Website research could not be loaded.");
  return body.jobs;
}

export default function WebsiteResearch({ prospectId, businessName, website, updatedAt, unsavedChanges = false, doNotContact = false, parentBusy = false }: Props) {
  const [jobs, setJobs] = useState<ResearchJob[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
    void loadJobs(controller.signal).then((items) => {
      if (!controller.signal.aborted) setJobs(items);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Website research could not be loaded.");
    });
    return () => { controller.abort(); activeRequest.current?.abort(); };
  }, [attempt]);

  async function act(action: "queue" | "process") {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true); setError(""); setNotice("");
    let completed = false;
    try {
      const response = await fetch(action === "queue" ? "/api/admin/outreach/research" : "/api/admin/outreach/research/process", {
        method: "POST", signal: controller.signal,
        ...(action === "queue" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospectId }) } : {}),
      });
      const body = await response.json() as { error?: string; processed?: number; status?: string };
      if (!response.ok) throw new Error(body.error || "The research action could not be completed.");
      completed = true;
      if (controller.signal.aborted) return;
      setNotice(action === "queue" ? `${businessName || "This business"} was added to the research queue. No outreach was sent.` : body.processed === 0 ? "No queued website checks are ready to process." : "One queued check was processed. Review its status and evidence below; no outreach was sent.");
      const items = await loadJobs(controller.signal);
      if (!controller.signal.aborted) setJobs(items);
    } catch (cause) {
      if (!controller.signal.aborted) setError(completed ? "The action completed, but the history could not refresh. Refresh the history before trying another action." : cause instanceof Error ? cause.message : "The research action could not be completed.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function refresh() {
    activeRequest.current?.abort();
    setJobs(null); setError(""); setNotice(""); setAttempt((previous) => previous + 1);
  }

  const disabled = busy || parentBusy || !jobs || !!error;
  const queueReason = !prospectId ? "Select a saved business first." : unsavedChanges ? "Save your changes before checking the website." : doNotContact ? "Research is blocked for do-not-contact records." : !safeSource(website) ? "Save the business’s official public HTTPS website first." : jobs?.some((job) => job.prospect_id === prospectId && (job.status === "queued" || job.status === "running")) ? "This business already has a queued or running check." : null;
  const hasPending = !!jobs?.some((job) => job.status === "queued" || job.status === "running");
  return <section className="panel form-panel-inner website-research" id="website-research" aria-labelledby="website-research-title">
    <div className="section-heading"><div><p className="eyebrow">PRIVATE WEBSITE RESEARCH</p><h2 id="website-research-title">Check the source. Review the evidence.</h2><p className="muted">Check a saved business’s public homepage for a useful starting point. Results stay in this dashboard for your review.</p></div><button className="button" type="button" disabled={busy || parentBusy || (!jobs && !error)} onClick={refresh}>Refresh history</button></div>
    <fieldset className="website-research-controls" disabled={disabled} aria-label="Website research actions"><button className="button button-primary" type="button" disabled={!!queueReason} onClick={() => void act("queue")}>{busy ? "Working…" : "Queue selected website"}</button><button className="button" type="button" disabled={!hasPending} onClick={() => void act("process")}>Process next queued check</button></fieldset>
    <p className="micro-note">{queueReason || `Selected: ${businessName}. Only its saved website will be checked.`} Processing checks the next queued business, which may be different from your selection.</p>
    <p className="micro-note">These checks report homepage evidence, not a full audit. A missing link does not prove a business lacks booking software. Review findings with the business before proposing work. No contacts are imported and no messages are sent.</p>
    {(error || notice) && <p className="form-message" role="status">{error || notice}</p>}
    {!jobs ? <p className="empty-state" role="status">{error ? "Research history is unavailable. Use Refresh history to retry." : "Loading website checks…"}</p> : !jobs.length ? <p className="empty-state">No website checks yet. Select a saved business with an official HTTPS website, then queue its first check.</p> : <>
      <p className="micro-note">The latest 50 checks across your saved businesses. Times shown in South African time.</p>
      <div className="website-research-grid">{jobs.map((job) => {
        const source = safeSource(job.result?.sourceUrl || job.source_url);
        const stale = job.prospect_id === prospectId && (unsavedChanges || (!!updatedAt && job.source_updated_at !== updatedAt));
        return <article className="website-research-card" key={job.id}>
          <div className="website-research-card-head"><h3>{job.business_name}</h3><span className={`status-pill ${job.status === "completed" ? "status-ready" : "status-pending"}`}>{job.status}</span></div>
          <p className="micro-note">Updated <time dateTime={job.updated_at}>{dateLabel(job.updated_at)}</time> · {job.attempts} {job.attempts === 1 ? "attempt" : "attempts"}</p>
          {source ? <a className="text-link website-research-source" href={source} target="_blank" rel="noopener noreferrer">{source} ↗</a> : <p className="micro-note">Source link unavailable.</p>}
          {stale && <p className="form-message">Saved details have changed since this check. Save current details and request a fresh check before using these results.</p>}
          {job.result ? <><p className="micro-note">Checked <time dateTime={job.result.checkedAt}>{dateLabel(job.result.checkedAt)}</time></p><dl className="website-research-evidence"><div><dt>Page title</dt><dd>{job.result.title || "Not detected"}</dd></div><div><dt>Page description</dt><dd>{job.result.description || "Not detected"}</dd></div><div><dt>Main heading</dt><dd>{job.result.heading || "Not detected"}</dd></div><div><dt>Mobile viewport tag</dt><dd>{job.result.hasViewport ? "Detected" : "Not detected"}</dd></div><div><dt>Contact link</dt><dd>{job.result.hasContactLink ? "Detected" : "Not detected on this page"}</dd></div><div><dt>Booking link</dt><dd>{job.result.hasBookingLink ? "Detected" : "Not detected on this page"}</dd></div></dl>{job.result.observations.length > 0 && <ul className="website-research-observations">{job.result.observations.map((observation, index) => <li key={`${job.id}-${index}`}>{observation}</li>)}</ul>}<p className="micro-note">Staff review required. Site content may have changed since this check.</p></> : <p className="muted">{job.error_code && researchErrorMessages[job.error_code] || (job.status === "queued" ? "Waiting for a scheduled or manual check." : job.status === "running" ? "Check in progress. Refresh the history shortly." : "This website could not be checked. No finding has been inferred.")}</p>}
        </article>;
      })}</div>
    </>}
  </section>;
}
