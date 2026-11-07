"use client";

import { FormEvent, useEffect, useState } from "react";

type Payment = { packageName: string; amountCents: number; dueDate: string; kind: string; paymentCode: string };
export function PaymentCode({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode); const [payment, setPayment] = useState<Payment | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const lookup = async (value: string) => { setLoading(true); setError(""); setPayment(null); const response = await fetch("/api/payment-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: value }) }); const data = await response.json(); if (response.ok) setPayment(data.payment); else setError(data.error ?? "We could not find that payment."); setLoading(false); };
  useEffect(() => { if (initialCode) void lookup(initialCode); }, [initialCode]);
  return <section className="payment-code"><p className="section-label">[ Secure payment code ]</p><h1>Pay when<br /><em>you&apos;re ready.</em></h1><p>Enter the private code EmberWeb sent you. It will only show the payment agreed for your project.</p><form onSubmit={(event: FormEvent) => { event.preventDefault(); void lookup(code); }}><label>Payment code<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="EW-1234ABCD" autoCapitalize="characters" required /></label><button type="submit" disabled={loading}>{loading ? "Checking…" : "Check payment →"}</button></form>{error && <p className="payment-error" role="alert">{error}</p>}{payment && <article className="payment-summary"><span>{payment.kind === "launch" ? "LAUNCH FEE" : "EMBERCARE"}</span><h2>{payment.packageName}</h2><strong>R{(payment.amountCents / 100).toFixed(2)}</strong><p>Due {payment.dueDate}</p><form action="/api/payfast/invoice" method="post"><input type="hidden" name="code" value={payment.paymentCode} /><button type="submit">Continue to secure PayFast payment →</button></form></article>}</section>;
}
