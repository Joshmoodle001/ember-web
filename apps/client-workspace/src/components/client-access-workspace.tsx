"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { shouldForgetProvisionAttempt } from "@/lib/provision-retry";
import "@/app/account/account.css";
type AccessData = { clients: { id: string; full_name: string; company: string | null; email: string }[]; memberships: { id: string; client_id: string; user_id: string; active: boolean }[]; resources: { id: string; project_id: string; title: string; url: string | null; description: string; kind: string }[]; projects: { id: string; client_id: string; title: string }[] };
export default function ClientAccessWorkspace() {
  const [data, setData] = useState<AccessData | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const provisionOperation = useRef<string | null>(null);
  async function load(signal?: AbortSignal) {
    const response = await fetch("/api/admin/client-access", { cache: "no-store", signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Client access could not be loaded.");
    setData(result);
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/client-access", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error("Client access could not be loaded.");
      setData(result);
    }).catch(() => { if (!controller.signal.aborted) { setFailed(true); setMessage("Client access could not be loaded. Refresh and try again."); } });
    return () => controller.abort();
  }, []);
  async function mutate(body: Record<string, unknown>) {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/admin/client-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The change could not be saved.");
      let refreshNote = "";
      try { await load(); } catch { refreshNote = " The list could not be refreshed. Reload this page before making another change."; }
      setMessage((typeof result.message === "string" ? result.message : "Saved. Client access is checked each time their dashboard loads.") + refreshNote);
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); return false; }
    finally { setPending(false); }
  }
  function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    void mutate({ action: "grant", clientId: fields.get("clientId"), email: fields.get("email") });
  }
  function resource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    void mutate({ action: "resource", projectId: fields.get("projectId"), title: fields.get("title"), url: fields.get("url"), description: fields.get("description"), kind: fields.get("kind") });
  }
  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    if (await mutate({action:"create_client",fullName:fields.get("fullName"),email:fields.get("email"),company:fields.get("company")})) form.reset();
  }
  async function createLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const clientId = String(fields.get("clientId") ?? "");
    const username = String(fields.get("username") ?? "").trim().toLowerCase();
    const retryKey = "ember-client-login-attempt";
    // Keep the non-secret operation id in this tab so a reload can safely retry.
    // Passwords are deliberately never stored in browser storage.
    let previousAmbiguous = false;
    try {
      const previous = JSON.parse(sessionStorage.getItem(retryKey) ?? "null") as { operationId?: unknown; clientId?: unknown; username?: unknown; ambiguous?: unknown } | null;
      if (previous && (previous.clientId !== clientId || previous.username !== username)) {
        setMessage("A previous request needs to be retried with the same business and username. Contact support if those details are unavailable."); return;
      }
      provisionOperation.current = typeof previous?.operationId === "string" ? previous.operationId : crypto.randomUUID();
      previousAmbiguous = previous?.ambiguous === true;
      sessionStorage.setItem(retryKey, JSON.stringify({ operationId: provisionOperation.current, clientId, username, ambiguous: true }));
    } catch { setMessage("This browser cannot save a safe retry reference. Enable browser storage and try again."); return; }
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/admin/client-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operationId: provisionOperation.current, clientId, username, password: fields.get("password") }) });
      const result = await response.json();
      if (!response.ok) {
        if (shouldForgetProvisionAttempt(previousAmbiguous, response.status, result.noReservation)) { sessionStorage.removeItem(retryKey); provisionOperation.current = null; }
        throw new Error(result.error ?? "Login could not be created.");
      }
      setMessage(result.recovered ? "Account linked. This request was recovered: use the password from the original attempt, or reset it securely before use." : "Client login created. Share the username and password with the client securely.");
      form.reset(); provisionOperation.current = null; sessionStorage.removeItem(retryKey);
      try { await load(); } catch { setMessage("Login created. Refresh to see the access list."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again with the same details."); }
    finally { setPending(false); }
  }
  return <div><section className="account-heading"><p className="eyebrow">PRIVATE CLIENT ACCOUNTS</p><h1>Clients, access & published resources</h1><p className="account-note">Create a business record to start a project directly. Clients use <a href="/login">Customer Login</a>; link a confirmed account to its business here when it is ready. Linking never grants staff or outreach access.</p></section>{message ? <p className="account-message" role="status">{message}</p> : null}{!data ? failed ? <button onClick={() => window.location.reload()}>Retry loading client access</button> : <p>Loading client access…</p> : <>
    <section className="account-card"><details><summary className="client-create-toggle">Create a client business</summary><form className="form-stack" onSubmit={(event) => void createClient(event)}><p className="account-note">Check the business list below first. This creates an internal client record so you can create projects and invoices. It does not create a login, send an invitation or grant account access.</p><label className="field">Contact name<input name="fullName" required minLength={2} maxLength={160} disabled={pending} autoComplete="name" /></label><label className="field">Contact email<input name="email" type="email" required maxLength={254} disabled={pending} autoComplete="email" /></label><label className="field">Business name (optional)<input name="company" maxLength={180} disabled={pending} autoComplete="organization" /></label><button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Create business record"}</button></form></details></section>
    <section className="account-card"><h2>Client businesses</h2>{data.clients.length ? <div className="account-list">{data.clients.map((client) => <div className="account-row" key={client.id}><span><strong>{client.company || client.full_name}</strong><br /><small>{client.full_name} · {client.email}</small></span><a href="/admin/projects">Create or manage projects</a></div>)}</div> : <p className="account-note">No business records yet. Create one above, or convert an agreed project brief from the business overview.</p>}</section>
    <section className="account-card"><h2>Create a username login</h2>{data.clients.length ? <form onSubmit={(event) => void createLogin(event)} className="form-stack"><label className="field">Client business<select name="clientId" required disabled={pending}><option value="">Select a business</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.company ?? client.full_name}</option>)}</select></label><label className="field">Username<input name="username" required pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" autoComplete="off" disabled={pending} /></label><label className="field">Password<input name="password" type="password" required minLength={12} maxLength={1024} autoComplete="new-password" disabled={pending} /></label><p className="account-note">No invitation email is sent. Use a unique password and share it securely. This account can access only the selected business.</p><button className="button button-primary" disabled={pending}>{pending ? "Creating…" : "Create client login"}</button></form> : <p className="account-note">Create the client business first.</p>}</section>
    <div className="account-grid"><section className="account-card"><h2>Link a client login</h2>{data.clients.length ? <form onSubmit={grant} className="form-stack"><label className="field">Client business<select name="clientId" required disabled={pending}>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.company ?? client.full_name} · {client.email}</option>)}</select></label><label className="field">Confirmed account email<input name="email" type="email" required maxLength={254} disabled={pending} autoComplete="off" /></label><p className="account-note">Check this person is authorised to view the selected business’s projects and invoices before granting access.</p><button className="button button-primary" disabled={pending}>Grant client access</button></form> : <p className="account-note">Create a business record above before linking a confirmed login.</p>}</section>
    <section className="account-card"><h2>Publish a site, app or feature</h2>{data.projects.length ? <form onSubmit={resource} className="form-stack"><label className="field">Project<select name="projectId" required disabled={pending}>{data.projects.map((project) => <option key={project.id} value={project.id}>{data.clients.find((client) => client.id === project.client_id)?.company ?? data.clients.find((client) => client.id === project.client_id)?.full_name ?? "Client"} · {project.title}</option>)}</select></label><label className="field">Title<input name="title" required minLength={2} maxLength={180} disabled={pending} /></label><label className="field">Type<select name="kind" disabled={pending}><option value="website">Website</option><option value="app">App</option><option value="feature">Feature</option><option value="document">Document</option></select></label><label className="field">HTTPS link<input name="url" type="url" required pattern="https://.*" maxLength={2000} disabled={pending} /></label><label className="field">Client-visible description<textarea name="description" maxLength={2000} disabled={pending} /></label><button className="button button-primary" disabled={pending}>Publish to client dashboard</button></form> : <p className="account-note">Create a delivery project before publishing its links and features.</p>}</section></div>
    <section className="account-card"><h2>Account access</h2>{data.memberships.length ? <div className="account-list">{data.memberships.map((membership) => <div className="account-row" key={membership.id}><span><strong>{data.clients.find((client) => client.id === membership.client_id)?.company ?? data.clients.find((client) => client.id === membership.client_id)?.full_name ?? "Client"}</strong><br /><small>Account ID: {membership.user_id} · {membership.active ? "Active" : "Revoked"}</small></span>{membership.active ? <button disabled={pending} onClick={() => void mutate({ action: "revoke", membershipId: membership.id })}>Revoke access</button> : null}</div>)}</div> : <p className="account-note">No client logins have been linked yet.</p>}</section>
    <section className="account-card"><h2>Published links & features</h2>{data.resources.length ? <div className="account-list">{data.resources.map((item) => <div className="account-row" key={item.id}><span><strong>{item.title}</strong><br /><small>{data.projects.find((project) => project.id === item.project_id)?.title} · {item.kind}</small></span><button disabled={pending} onClick={() => void mutate({ action: "remove_resource", resourceId: item.id })}>Remove from dashboard</button></div>)}</div> : <p className="account-note">No resources have been published yet.</p>}</section>
    </>}</div>;
}
