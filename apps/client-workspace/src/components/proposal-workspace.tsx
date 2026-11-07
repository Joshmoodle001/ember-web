"use client";

import { FormEvent, useEffect, useState } from "react";

type InquiryChoice = { id: string; name: string; company: string | null; stage: string };
type ClientChoice = { id: string; full_name: string; company: string | null };
type Proposal = { id: string; inquiry_id: string | null; client_id: string | null; title: string; summary: string; proposal_url: string | null; amount_cents: number; currency: string; status: string; version: number; sent_at: string | null; accepted_at: string | null; share_token_expires_at: string | null; created_at: string; inquiries: { name: string; company: string | null } | null; clients: { full_name: string; company: string | null } | null };
type ProposalData = { proposals: Proposal[]; inquiries: InquiryChoice[]; clients: ClientChoice[] };
const formatMoney = (cents: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);

export default function ProposalWorkspace() {
  const [data, setData] = useState<ProposalData | null>(null);
  const [owner, setOwner] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [proposalUrl, setProposalUrl] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareLinks, setShareLinks] = useState<Record<string, string>>({});

  async function fetchData(signal?: AbortSignal): Promise<ProposalData> {
    const response = await fetch("/api/admin/proposals", { cache: "no-store", signal });
    const result = await response.json() as ProposalData & { error?: string };
    if (!response.ok) throw new Error(result.error || "Proposal records could not be loaded.");
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
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Proposal records could not be loaded.");
      }
    })();
    return () => controller.abort();
  }, []);

  async function createProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!owner) return;
    setBusy(true);
    setMessage("");
    const [kind, id] = owner.split(":");
    try {
      const response = await fetch("/api/admin/proposals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: kind === "inquiry" ? id : null, clientId: kind === "client" ? id : null, title, summary, proposalUrl, amount }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Proposal could not be saved.");
      setTitle(""); setSummary(""); setProposalUrl(""); setAmount("");
      await load();
      setMessage("Proposal draft saved. Create a client review link when it is ready to send.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Proposal could not be saved.");
    } finally { setBusy(false); }
  }

  async function changeStatus(id: string, status: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/proposals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Proposal status could not be updated.");
      await load();
      setMessage("Proposal stage updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Proposal status could not be updated."); }
    finally { setBusy(false); }
  }

  async function createShareLink(id: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/proposals/${id}/share`, { method: "POST" });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Proposal link could not be created.");
      setShareLinks((current) => ({ ...current, [id]: result.url! }));
      let copied = false;
      try { await navigator.clipboard.writeText(result.url); copied = true; } catch { /* Keep the link visible for manual copying. */ }
      await load();
      setMessage(copied ? "Client review link copied. Any earlier link has been replaced." : "Client review link created. Copy it from the field below; any earlier link has been replaced.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Proposal link could not be created.");
    } finally { setBusy(false); }
  }

  async function copyShareLink(id: string) {
    const url = shareLinks[id];
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Client review link copied.");
    } catch {
      setMessage("Clipboard access is unavailable. Select and copy the client link from its field.");
    }
  }

  return (
    <div className="workspace-page">
      <div className="page-heading"><div><p className="eyebrow">SCOPE & AGREEMENT</p><h1>Proposals</h1><p className="muted">Keep the scope, amount, and client acceptance attached to the inquiry that started the work.</p></div></div>
      <div className="two-column-layout">
        <section className="panel form-panel-inner"><p className="eyebrow">NEW PROPOSAL</p><h2>Record the offer</h2><p className="muted">Save the scope and total, then create a private review link for the client when the offer is ready.</p>
          <form className="form-stack" onSubmit={createProposal}>
            <label className="field" htmlFor="proposal-owner">Attach to
              <select id="proposal-owner" value={owner} onChange={(event) => setOwner(event.target.value)} required>
                <option value="">Choose an enquiry or client</option>
                {(data?.inquiries ?? []).map((item) => <option key={item.id} value={`inquiry:${item.id}`}>Enquiry · {item.company || item.name}</option>)}
                {(data?.clients ?? []).map((item) => <option key={item.id} value={`client:${item.id}`}>Client · {item.company || item.full_name}</option>)}
              </select>
            </label>
            <label className="field" htmlFor="proposal-title">Proposal title<input id="proposal-title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={180} /></label>
            <label className="field" htmlFor="proposal-summary">Scope and terms<textarea id="proposal-summary" value={summary} onChange={(event) => setSummary(event.target.value)} required minLength={10} maxLength={5000} /></label>
            <label className="field" htmlFor="proposal-url">Proposal document link <span className="muted">(optional, HTTPS)</span><input id="proposal-url" type="url" value={proposalUrl} onChange={(event) => setProposalUrl(event.target.value)} placeholder="https://…" /></label>
            <label className="field" htmlFor="proposal-amount">Proposed total (ZAR)<input id="proposal-amount" type="number" min="5" max="10000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
            <button className="button button-primary" disabled={busy || !data?.inquiries.length && !data?.clients.length}>Save proposal draft</button>
          </form>
        </section>
        <section className="panel data-panel"><div className="section-heading"><div><p className="eyebrow">PROPOSAL REGISTER</p><h2>Recent proposals</h2></div></div>
          {message && <p className="inline-message" aria-live="polite">{message}</p>}
          {!data ? <p className="empty-state">Loading proposals…</p> : !data.proposals.length ? <p className="empty-state">Proposal drafts will appear here.</p> : <div className="proposal-list">{data.proposals.map((item) => <article className="proposal-card" key={item.id}>
            <div className="proposal-card-head"><div><span className="version-tag">V{item.version}</span><h3>{item.title}</h3><p className="muted">{item.inquiries?.company || item.inquiries?.name || item.clients?.company || item.clients?.full_name}</p></div><strong>{formatMoney(item.amount_cents)}</strong></div>
            <p className="proposal-summary">{item.summary}</p>
            {item.proposal_url && <a className="text-link" href={item.proposal_url} target="_blank" rel="noreferrer">Open proposal document ↗</a>}
            <div className="proposal-footer"><span className={`state-${item.status}`}>{item.status}</span>
              {item.status === "sent" && <select aria-label={`Status for ${item.title}`} value={item.status} disabled={busy} onChange={(event) => void changeStatus(item.id, event.target.value)}><option value="sent">sent</option><option value="declined">declined</option><option value="expired">expired</option></select>}
              {(item.status === "draft" || item.status === "sent") && <button className="button button-quiet" type="button" disabled={busy} onClick={() => void createShareLink(item.id)}>{item.status === "draft" ? "Create client link" : "Rotate client link"}</button>}
            </div>
            {item.status === "sent" && item.share_token_expires_at && <p className="micro-note">Private review link expires {new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(item.share_token_expires_at))}. Rotating it will invalidate the earlier link.</p>}
            {shareLinks[item.id] && <div className="proposal-share-link"><label className="field" htmlFor={`proposal-link-${item.id}`}>Client review link<input id={`proposal-link-${item.id}`} value={shareLinks[item.id]} readOnly /></label><button className="button button-quiet" type="button" onClick={() => void copyShareLink(item.id)}>Copy client link</button></div>}
          </article>)}</div>}
        </section>
      </div>
    </div>
  );
}
