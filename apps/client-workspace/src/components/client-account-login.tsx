"use client";
import { useState, type FormEvent } from "react";

export default function ClientAccountLogin({ confirmationError = false, register = false, registrationEnabled = false }: { confirmationError?: boolean; register?: boolean; registrationEnabled?: boolean }) {
  const [mode, setMode] = useState<"login" | "register">(register && registrationEnabled ? "register" : "login");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(confirmationError ? "This confirmation link has expired or could not be completed. Try signing in if your email is already confirmed." : "");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "register" && !registrationEnabled) { setMessage("Public registration is not available yet. Contact EmberWeb to arrange your client account."); return; }
    if (mode === "register" && process.env.NODE_ENV === "production" && window.location.origin !== "https://emberweb.co.za") { window.location.assign("https://emberweb.co.za/login?register=1"); return; }
    const form = event.currentTarget;
    const fields = new FormData(form);
    setPending(true); setMessage("");
    try {
      const identity = mode === "register" ? { email: fields.get("email") } : { identifier: fields.get("identifier") };
      const response = await fetch(`/api/account/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...identity, password: fields.get("password") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to complete this request.");
      form.reset();
      if (mode === "login") {
        if (data.next !== "/admin" && data.next !== "/account") throw new Error("Sign-in could not be completed. Please try again.");
        window.location.assign(data.next);
      }
      else setMessage(typeof data.message === "string" ? data.message : "Check your email to confirm your account, then sign in. EmberWeb will link your client workspace separately.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again later."); }
    finally { setPending(false); }
  }
  return <>
    {registrationEnabled && <div className="account-tabs"><button disabled={pending} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setMessage(""); }}>Sign in</button>{registrationEnabled && <button disabled={pending} aria-pressed={mode === "register"} onClick={() => { if (process.env.NODE_ENV === "production" && window.location.origin !== "https://emberweb.co.za") { window.location.assign("https://emberweb.co.za/login?register=1"); return; } setMode("register"); setMessage(""); }}>Create account</button>}</div>}
    <form className="form-stack" onSubmit={submit}>
      <label className="field">{mode === "register" ? "Your email" : "Email or username"}<input name={mode === "register" ? "email" : "identifier"} type={mode === "register" ? "email" : "text"} autoComplete={mode === "register" ? "email" : "username"} autoCapitalize="none" spellCheck={false} required maxLength={254} disabled={pending} /></label>
      <label className="field">Password<input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 12 : 1} maxLength={mode === "register" ? 128 : 1024} required disabled={pending} /></label>
      {mode === "register" ? <p className="account-note">Use at least 12 characters. Confirm your email before signing in. Creating an account does not grant access to another client’s information.</p> : null}
      <button className="button button-primary" disabled={pending} type="submit">{pending ? "Please wait…" : mode === "register" ? "Create my account" : "Sign in"}</button>
    </form>
    {!registrationEnabled ? <p className="account-note">Need client access? <a className="text-link" href="https://wa.me/27723398781" target="_blank" rel="noopener noreferrer">Contact EmberWeb to arrange your account <span className="sr-only">(opens in a new tab)</span></a>.</p> : null}
    {message ? <p className="account-message" role="status">{message}</p> : null}
  </>;
}
