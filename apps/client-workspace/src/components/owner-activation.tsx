"use client";
import { useState, type FormEvent } from "react";

export default function OwnerActivation() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    if (fields.get("password") !== fields.get("confirm")) { setMessage("The passwords do not match."); setBusy(false); return; }
    try {
      const response = await fetch("/api/auth/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: fields.get("code"), password: fields.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Activation could not be completed.");
      form.reset(); setDone(true); setMessage("Your staff password is set. You can now sign in.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Activation could not be completed."); }
    finally { setBusy(false); }
  }
  return done ? <div><p role="status">{message}</p><a className="button button-primary" href="/login">Open staff sign-in</a></div> : <form className="form-stack" onSubmit={activate}><fieldset className="form-fields" disabled={busy}><label className="field">Private owner activation code<input name="code" autoComplete="off" type="password" required pattern="[a-f0-9]{64}" minLength={64} maxLength={64} /></label><label className="field">Choose your staff password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label><label className="field">Confirm password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label><button className="button button-primary" disabled={busy}>{busy ? "Activating…" : "Activate staff password"}</button></fieldset><p className="form-message" role="status">{message}</p><p className="micro-note">Owner activation is private, expires and can be used once. It does not create public accounts or grant access to new staff.</p></form>;
}
