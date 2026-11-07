"use client";

import { FormEvent, useEffect, useState } from "react";
import { filterRecordedPayments, type RecordedPayment } from "@/lib/finance-history";

type Client = { id: string; full_name: string; company: string | null; email: string };
type Invoice = { id: string; invoice_number: string; description: string; amount_cents: number; currency: string; status: string; due_on: string | null; created_at: string; clients: { full_name: string; company: string | null } | null };
type DuplicatePayment = { id: string; amount_cents: number; created_at: string; invoices: { invoice_number: string } | null };
type FinanceData = { clients: Client[]; invoices: Invoice[]; duplicatePayments: DuplicatePayment[]; payments: RecordedPayment[]; paymentHistoryLimit: number; payfastReady: boolean };
const formatMoney = (cents: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);

export default function FinanceWorkspace() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [message, setMessage] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [historyClientId, setHistoryClientId] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const visiblePayments = filterRecordedPayments(data?.payments ?? [], historyClientId, historyQuery);

  async function fetchData(signal?: AbortSignal): Promise<FinanceData> {
    const response = await fetch("/api/admin/finance", { cache: "no-store", signal });
    const result = await response.json() as FinanceData & { error?: string };
    if (!response.ok) throw new Error(result.error || "Finance records could not be loaded.");
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
        if (!controller.signal.aborted) { setData(initialData); setLoadError(""); }
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Finance records could not be loaded.");
      }
    })();
    return () => controller.abort();
  }, [loadAttempt]);

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, description, amount, dueOn }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Invoice could not be created.");
      setDescription(""); setAmount(""); setDueOn("");
      await load();
      setMessage("Draft invoice created. Generate a share link after reviewing it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invoice could not be created."); }
    finally { setBusy(false); }
  }

  async function shareInvoice(invoice: Invoice) {
    setBusy(true); setMessage(""); setShareUrl("");
    try {
      const response = await fetch(`/api/admin/finance/${invoice.id}/share`, { method: "POST" });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Payment link could not be created.");
      setShareUrl(result.url);
      let copied = false;
      try {
        await navigator.clipboard.writeText(result.url);
        copied = true;
      } catch {
        // Keep the rotated link visible below when clipboard access is unavailable.
      }
      let refreshed = true;
      try {
        await load();
      } catch {
        refreshed = false;
      }
      const action = invoice.status === "draft" ? "created" : "rotated";
      const clipboardNote = copied ? "copied to the clipboard" : "shown below so you can copy it";
      const refreshNote = refreshed ? "" : " The invoice list could not be refreshed.";
      setMessage(`Secure invoice link ${action} and ${clipboardNote}. Any earlier link has been revoked.${refreshNote}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Payment link could not be created."); }
    finally { setBusy(false); }
  }

  async function revokeInvoiceLink(invoice: Invoice) {
    setBusy(true); setMessage(""); setShareUrl("");
    try {
      const response = await fetch(`/api/admin/finance/${invoice.id}/share`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The invoice link could not be revoked.");
      setMessage("Private link revoked. The invoice and payment history are unchanged. A payment already started can still be confirmed by PayFast.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The invoice link could not be revoked."); }
    finally { setBusy(false); }
  }

  return (
    <div className="workspace-page">
      <div className="page-heading"><div><p className="eyebrow">FINANCE</p><h1>Invoices & payments</h1><p className="muted">Create an invoice from the agreed proposal, then share a private payment link. Payment status updates only after PayFast confirms it.</p></div></div>
      <div className="status-row"><span className={`status-pill ${data?.payfastReady ? "status-ready" : "status-pending"}`}>{!data ? "Payment configuration not loaded" : data.payfastReady ? "PayFast credentials configured" : "PayFast is not active yet"}</span><span className="muted">Currency: South African rand · minimum payment R5.00</span></div>
      {loadError ? <section className="panel" role="alert"><p>{loadError}</p><button className="small-button" onClick={() => { setLoadError(""); setLoadAttempt((attempt) => attempt + 1); }}>Retry finance records</button></section> : null}
      {data?.duplicatePayments.length ? <section className="panel form-panel-inner" role="alert"><p className="eyebrow">PAYMENT REVIEW</p><h2>Duplicate payments need attention</h2><p className="muted">A second successful PayFast transaction was recorded against an already-paid invoice. Review the transaction in PayFast and arrange any needed refund manually.</p>{data.duplicatePayments.map((payment) => <p className="status-pill status-pending" key={payment.id}>{payment.invoices?.invoice_number ?? "Invoice"} · {formatMoney(payment.amount_cents)} · {new Date(payment.created_at).toLocaleString("en-ZA")}</p>)}</section> : null}
      <div className="two-column-layout finance-layout">
        <section className="panel form-panel-inner"><p className="eyebrow">NEW INVOICE</p><h2>Bill a client</h2>
          {!data ? <p className="empty-state" role="status">{loadError ? "Client records are unavailable." : "Loading client records…"}</p> : !data.clients.length ? <div className="empty-state"><strong>No client records yet.</strong><p>Move an enquiry to Proposal or Won in the pipeline and create its client record first.</p></div> : <form className="form-stack" onSubmit={createInvoice}>
            <label className="field" htmlFor="invoice-client">Client<select id="invoice-client" value={clientId} onChange={(event) => setClientId(event.target.value)} required><option value="">Choose client</option>{data.clients.map((client) => <option value={client.id} key={client.id}>{client.company || client.full_name}</option>)}</select></label>
            <label className="field" htmlFor="invoice-description">Invoice description<input id="invoice-description" value={description} onChange={(event) => setDescription(event.target.value)} required minLength={2} maxLength={1000} placeholder="Website discovery and design deposit" /></label>
            <label className="field" htmlFor="invoice-amount">Total amount (ZAR)<input id="invoice-amount" type="number" min="5" max="10000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
            <label className="field" htmlFor="invoice-due">Due date <span className="muted">(optional)</span><input id="invoice-due" type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} /></label>
            <button className="button button-primary" disabled={busy}>Create draft invoice</button>
          </form>}
        </section>
        <section className="panel data-panel"><div className="section-heading"><div><p className="eyebrow">INVOICE REGISTER</p><h2>Invoices</h2></div><span className="muted">{data?.invoices.length ?? 0} total</span></div>
          {message && <p className="inline-message" aria-live="polite">{message}</p>}
          {!data ? <p className="empty-state" role="status">{loadError ? "Invoice records are unavailable." : "Loading invoices…"}</p> : !data.invoices.length ? <p className="empty-state">Draft invoices will appear here.</p> : <div className="invoice-list">{data.invoices.map((invoice) => <article className="invoice-card" key={invoice.id}>
            <div className="invoice-head"><div><span className="invoice-number">{invoice.invoice_number}</span><h3>{invoice.clients?.company || invoice.clients?.full_name || "Client"}</h3><p className="muted">{invoice.description}</p></div><strong>{formatMoney(invoice.amount_cents)}</strong></div>
            <div className="invoice-footer">
              <span className={`state-${invoice.status}`}>{invoice.status}</span>
              {invoice.due_on && <span className="muted">Due {invoice.due_on}</span>}
              {["draft", "sent", "overdue"].includes(invoice.status)
                ? <button className="small-button" disabled={busy} onClick={() => void shareInvoice(invoice)}>{invoice.status === "draft" ? "Generate private link" : "Rotate payment link"}</button>
                : <span className="stage-note">{invoice.status === "paid" ? "Payment confirmed" : "Link unavailable"}</span>}
              {["sent", "overdue", "paid"].includes(invoice.status) && <button className="small-button" disabled={busy} onClick={() => void revokeInvoiceLink(invoice)}>Revoke private link</button>}
            </div>
          </article>)}</div>}
          {shareUrl && <label className="field" htmlFor="invoice-share-url">Current private payment link<input id="invoice-share-url" type="url" value={shareUrl} readOnly onFocus={(event) => event.currentTarget.select()} /></label>}
        </section>
      </div>
      <section className="panel data-panel" aria-labelledby="payment-history-title">
        <div className="section-heading"><div><p className="eyebrow">RECORDED TRANSACTIONS</p><h2 id="payment-history-title">Payment history</h2><p className="muted">Latest {data?.paymentHistoryLimit ?? 200} recorded payments, newest first. Filters apply to this loaded history. A pending, failed or cancelled record does not confirm payment.</p></div></div>
        {!data ? <p className="empty-state" role="status">{loadError ? "Payment history is unavailable. Retry finance records above." : "Loading payment history…"}</p> : !data.payments.length ? <p className="empty-state">No payment transactions have been recorded yet.</p> : <>
          <div className="form-grid"><label className="field" htmlFor="payment-history-client">Client<select id="payment-history-client" value={historyClientId} onChange={(event) => setHistoryClientId(event.target.value)}><option value="">All clients</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.company || client.full_name}</option>)}</select></label><label className="field" htmlFor="payment-history-search">Find an invoice or business<input id="payment-history-search" type="search" maxLength={200} value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} /></label></div>
          <p className="micro-note" role="status">{visiblePayments.length} of {data.payments.length} loaded records. On smaller screens, scroll across the table to view all columns.</p>
          {!visiblePayments.length ? <p className="empty-state">No recorded payments match these filters.</p> : <div className="table-wrap" role="region" aria-label="Recorded payment transactions" tabIndex={0}><table><caption className="sr-only">Latest recorded payment history, including transaction status and duplicate warnings</caption><thead><tr><th scope="col">Recorded</th><th scope="col">Client</th><th scope="col">Invoice</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">Review</th></tr></thead><tbody>{visiblePayments.map((payment) => <tr key={payment.id}><td><time dateTime={payment.created_at}>{new Date(payment.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })} SAST</time></td><td>{payment.invoices?.clients?.company || payment.invoices?.clients?.full_name || "Client unavailable"}</td><td>{payment.invoices?.invoice_number ?? "Invoice unavailable"}</td><td>{formatMoney(payment.amount_cents)}</td><td>{payment.status === "complete" ? "Confirmed" : payment.status}</td><td>{payment.duplicate_of ? "Duplicate — review in PayFast" : "—"}</td></tr>)}</tbody></table></div>}
        </>}
      </section>
    </div>
  );
}
