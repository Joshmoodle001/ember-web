"use client";
import { useEffect, useState, type FormEvent } from "react";
export default function PasswordSetup() {
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/recovery", { cache: "no-store", signal: controller.signal }).then(r => r.json()).then(data => { if (data.email) { setEmail(data.email); setVerified(true); } setReady(true); }).catch(() => { if (!controller.signal.aborted) setReady(true); });
    return () => controller.abort();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    if (verified && fields.get("password") !== fields.get("confirm")) { setNotice("Your passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/recovery", { method: verified ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(verified ? { password: fields.get("password") } : { email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Please retry.");
      form.reset();
      if (verified) { setNotice("Your password is saved. You can now open your workspace."); setDone(true); }
      else setNotice(data.message);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Please retry."); }
    finally { setBusy(false); }
  }
  return <section className="account-card account-auth"><p className="eyebrow">PRIVATE ACCOUNT ACCESS</p><h1>{done ? "Your password is ready." : verified ? "Choose your password." : "Get your password link."}</h1><p className="account-note">{verified ? `Email verified: ${email}. Your password is private; EmberWeb staff cannot read it.` : "Use the email connected to your EmberWeb account. Your single-use link is sent to that inbox."}</p>{done ? null : ready ? <form className="form-stack" onSubmit={submit}>{verified ? <><label className="field">New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} /></label><label className="field">Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} /></label></> : <label className="field">Account email<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} disabled={busy} /></label>}<button className="button button-primary" disabled={busy}>{busy ? "Working…" : verified ? "Save my password" : "Email my private link"}</button></form> : <p role="status">Checking your access…</p>}{notice && <p role="status" className="account-message">{notice}</p>}<a className="quiet-link" href="/login">Open your workspace</a></section>;
}
