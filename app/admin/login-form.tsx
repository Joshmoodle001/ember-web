"use client";
import { FormEvent, useState } from "react";
export function LoginForm() {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setLoading(true); setError(""); const form = new FormData(event.currentTarget); const response = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) }); if (response.ok) window.location.assign("/admin"); else { const data = await response.json(); setError(data.error || "Something needs attention."); setLoading(false); } };
  return <main id="main-content" className="admin-shell"><section className="admin-login"><p className="section-label">[ EmberWeb owner workspace ]</p><h1>Welcome<br />back, <em>Josh.</em></h1><p>Sign in to see enquiries, clients and private payment requests.</p><form onSubmit={submit}><label>Username<input name="username" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button type="submit" disabled={loading}>{loading ? "Signing in…" : "Open workspace →"}</button>{error && <p role="alert">{error}</p>}</form></section></main>;
}
