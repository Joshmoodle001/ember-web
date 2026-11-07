"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import OutreachOverview from "@/components/outreach-overview";

type Stage = "new" | "discovery" | "qualified" | "proposal" | "won" | "active" | "delivered" | "closed";
type Inquiry = { id: string; name: string; company: string | null; email: string; phone: string | null; service: string; budget: string | null; brief: string; stage: Stage; created_at: string };
type Client = { id: string; inquiry_id: string | null; full_name: string; company: string | null; email: string };
type Invoice = { id: string; invoice_number: string; description: string; amount_cents: number; currency: string; status: string; due_on: string | null; clients: { full_name: string; company: string | null } | null };
type Overview = { inquiries: Inquiry[]; clients: Client[]; invoices: Invoice[]; projects: Array<{id:string;title:string;status:string;progress:number}>; bookingUrl: string | null; payfastReady: boolean };

const stages: Array<{ id: Stage; label: string }> = [
  { id: "new", label: "New enquiry" }, { id: "discovery", label: "Discovery" }, { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" }, { id: "won", label: "Won" }, { id: "active", label: "In delivery" },
  { id: "delivered", label: "Delivered" }, { id: "closed", label: "Closed" },
];

const money = (cents: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
const date = (value: string) => new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value));

export default function WorkspaceDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchOverview(signal?: AbortSignal): Promise<Overview> {
    const response = await fetch("/api/admin/overview", { cache: "no-store", signal });
    const result = await response.json() as Overview & { error?: string };
    if (!response.ok) throw new Error(result.error || "Workspace could not be loaded.");
    return result;
  }

  async function refresh() {
    setData(await fetchOverview());
  }

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const initialData = await fetchOverview(controller.signal);
        if (!controller.signal.aborted) setData(initialData);
      } catch (loadError) {
        if (!controller.signal.aborted) setMessage(loadError instanceof Error ? loadError.message : "Workspace could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  async function updateStage(id: string, stage: Stage) {
    setUpdatingId(id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/inquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, stage }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Inquiry could not be updated.");
      await refresh();
      setMessage("Inquiry stage updated.");
    } catch (updateError) {
      setMessage(updateError instanceof Error ? updateError.message : "Inquiry could not be updated.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function convertInquiry(id: string) {
    setUpdatingId(id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/clients/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inquiryId: id }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Client record could not be created.");
      await refresh();
      setMessage("Client record connected to this enquiry.");
    } catch (convertError) {
      setMessage(convertError instanceof Error ? convertError.message : "Client record could not be created.");
    } finally {
      setUpdatingId(null);
    }
  }

  const inquiries = data?.inquiries ?? [];
  const counts = stages.map((stage) => ({ ...stage, count: inquiries.filter((inquiry) => inquiry.stage === stage.id).length }));

  return (
    <div className="workspace-page">
      <div className="page-heading">
        <div><p className="eyebrow">INTERNAL DASHBOARD</p><h1>Your business, in one place.</h1><p className="muted">Review outreach, move enquiries forward, and manage proposals, payments and delivery from this workspace.</p></div>
        <Link className="button button-primary" href="/start" target="_blank">Preview intake form <span aria-hidden="true">↗</span></Link>
      </div>
      <nav className="workspace-areas" aria-label="Business management areas">
        <Link href="/admin/clients"><strong>Clients & access</strong><span>Business accounts and who can see their projects</span></Link>
        <Link href="/admin/projects"><strong>Projects</strong><span>Briefs, milestones and published site links</span></Link>
        <Link href="/admin/requests"><strong>Requests & support</strong><span>Client questions, project changes and shared replies</span></Link>
        <Link href="/admin/finance"><strong>Finance</strong><span>Agreed invoices and recorded payment history</span></Link>
        <Link href="/admin/outreach"><strong>Outreach</strong><span>Business research, offers and reviewed drafts</span></Link>
      </nav>
      <div className="pipeline-grid">
        {counts.slice(0, 6).map((stage, index) => <div className="pipeline-card" key={stage.id}><span className="pipeline-number">0{index + 1}</span><span className="pipeline-label">{stage.label}</span><strong>{stage.count.toString().padStart(2, "0")}</strong></div>)}
      </div>
      <div className="status-row">
        {!data ? <span className="status-pill status-pending">{loading ? "Loading booking configuration…" : "Booking configuration unavailable"}</span> : data.bookingUrl ? <a className="status-pill status-ready" href={data.bookingUrl} target="_blank" rel="noreferrer">Google Calendar booking link ready <span>↗</span></a> : <span className="status-pill status-pending">Add your Google Calendar appointment link to enable booking</span>}
        {!data ? <span className="status-pill status-pending">{loading ? "Loading payment configuration…" : "Payment configuration unavailable"}</span> : data.payfastReady ? <span className="status-pill status-ready">PayFast configured</span> : <span className="status-pill status-pending">PayFast waiting for Vercel credentials</span>}
        <Link className="text-link" href="/admin/finance">Open finance →</Link>
      </div>
      {message && <p className="inline-message" aria-live="polite">{message}</p>}
      <OutreachOverview />
      <section className="panel data-panel">
        <div className="section-heading"><div><p className="eyebrow">INQUIRIES</p><h2>Recent project briefs</h2></div><span className="muted">{inquiries.length} shown</span></div>
        {loading ? <p className="empty-state">Loading workspace…</p> : inquiries.length === 0 ? <div className="empty-state"><strong>No project briefs yet.</strong><p>Use the intake form to capture the first enquiry.</p></div> : (
          <div className="table-wrap"><table><thead><tr><th>Client</th><th>Service</th><th>Received</th><th>Stage</th><th>Next step</th></tr></thead><tbody>
            {inquiries.map((inquiry) => {
              const linkedClient = data?.clients.some((client) => client.inquiry_id === inquiry.id) ?? false;
              return <tr key={inquiry.id}><td><strong>{inquiry.name}</strong><small>{inquiry.company || inquiry.email}</small></td><td>{inquiry.service.replaceAll("_", " ")}</td><td>{date(inquiry.created_at)}</td><td><select aria-label={`Stage for ${inquiry.name}`} value={inquiry.stage} disabled={updatingId !== null} onChange={(event) => void updateStage(inquiry.id, event.target.value as Stage)}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></td><td>{(inquiry.stage === "proposal" || inquiry.stage === "won") ? linkedClient ? <span className="stage-note">Client connected</span> : <button className="small-button" disabled={updatingId !== null} onClick={() => void convertInquiry(inquiry.id)}>Create client</button> : inquiry.stage === "new" || inquiry.stage === "discovery" ? data?.bookingUrl ? <a className="text-link" href={data.bookingUrl} target="_blank" rel="noreferrer">Book discovery ↗</a> : <span className="stage-note">Add Calendar link</span> : <span className="stage-note">In progress</span>}</td></tr>;
            })}
          </tbody></table></div>
        )}
      </section>
      <div className="dashboard-bottom">
        <section className="panel compact-panel"><div className="section-heading"><div><p className="eyebrow">FINANCE</p><h2>Client invoices</h2></div><Link href="/admin/finance" className="text-link">View all →</Link></div>
          {(data?.invoices ?? []).slice(0, 4).map((invoice) => <div className="list-row" key={invoice.id}><div><strong>{invoice.invoice_number}</strong><small>{invoice.clients?.company || invoice.clients?.full_name || invoice.description}</small></div><div className="list-end"><strong>{money(invoice.amount_cents)}</strong><small className={`state-${invoice.status}`}>{invoice.status}</small></div></div>)}
          {!loading && !data?.invoices.length && <p className="empty-state small">No invoices issued yet. Create an invoice once you have agreed the scope and amount with a client.</p>}
        </section>
        <section className="panel compact-panel"><div className="section-heading"><div><p className="eyebrow">DELIVERY</p><h2>Active projects</h2></div><Link href="/admin/projects" className="text-link">Manage →</Link></div>
          {(data?.projects ?? []).slice(0, 4).map((project) => <div className="project-row" key={project.id}><div className="project-row-top"><strong>{project.title}</strong><span>{project.progress}%</span></div><div className="progress-track"><span style={{ width: `${project.progress}%` }} /></div><small>{project.status.replaceAll("_", " ")}</small></div>)}
          {!loading && !data?.projects.length && <p className="empty-state small">Create a project after your proposal is accepted.</p>}
        </section>
      </div>
    </div>
  );
}
