"use client";

import { useEffect, useState } from "react";

type Invoice = { invoice_id: string; invoice_number: string; client_label: string; description: string; amount_cents: number; currency: string; status: string; due_on: string | null };
type PaymentLookup = { invoice?: Invoice; payfastReady?: boolean; error?: string };
type CheckoutResponse = { actionUrl?: string; fields?: Array<[string, string]>; error?: string };
const formatMoney = (cents: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);

export default function InvoicePayment({ token }: { token: string }) {
  const [data, setData] = useState<PaymentLookup | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/pay/invoice?token=${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as PaymentLookup;
        if (!response.ok) throw new Error(result.error || "Invoice link is invalid or expired.");
        setData(result);
      })
      .catch((error: unknown) => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Invoice link is invalid or expired."); });
    return () => controller.abort();
  }, [token]);

  async function startPayment() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/payfast/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const result = await response.json() as CheckoutResponse;
      if (!response.ok || !result.actionUrl || !result.fields) throw new Error(result.error || "Payment could not be started.");
      const form = document.createElement("form");
      form.method = "POST";
      form.action = result.actionUrl;
      form.style.display = "none";
      result.fields.forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment could not be started.");
      setBusy(false);
    }
  }

  const invoice = data?.invoice;
  return (
    <div className="shell narrow-shell">
      <header className="topbar"><span className="brand">EMBER<span>WEB</span></span><span className="topbar-label">SECURE INVOICE</span></header>
      <section className="panel invoice-public-panel"><p className="eyebrow">PAYMENT SUMMARY</p>
        {!invoice && !message && <p className="empty-state">Loading invoice…</p>}
        {!invoice && message && <h1>This invoice link is unavailable.</h1>}
        {message && <p className="form-message error" role="alert">{message}</p>}
        {invoice && <>
          <span className="invoice-number">{invoice.invoice_number}</span>
          <h1>{invoice.client_label}</h1>
          <p className="invoice-description">{invoice.description}</p>
          <div className="invoice-amount"><span>Amount due</span><strong>{formatMoney(invoice.amount_cents)}</strong></div>
          {invoice.due_on && <p className="muted">Due {invoice.due_on}</p>}
          {invoice.status === "paid" ? <p className="status-pill status-ready">Payment received</p> : data?.payfastReady ? <button className="button button-primary pay-button" disabled={busy} onClick={() => void startPayment()}>{busy ? "Opening PayFast…" : "Pay securely with PayFast"}<span aria-hidden="true">→</span></button> : <p className="status-pill status-pending">Online payment is being configured. Please contact EmberWeb to arrange payment.</p>}
          <p className="micro-note">Your payment status updates after PayFast confirms the transaction. Returning to this page does not mark an invoice as paid.</p>
        </>}
      </section>
      <p className="footer-note">This private invoice link is for the named client. If the link is unavailable, open the latest link shared by EmberWeb or ask us for a fresh one. You do not need an account.</p>
      <div className="hero-actions"><a className="button button-quiet" href="https://wa.me/27723398781" target="_blank" rel="noopener noreferrer">Contact EmberWeb about this invoice</a><a className="button button-quiet" href="https://emberweb.co.za/">Return to EmberWeb</a></div>
    </div>
  );
}
