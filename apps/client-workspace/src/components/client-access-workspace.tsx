"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import "@/app/account/account.css";
type AccessData = { clients: { id: string; full_name: string; company: string | null; email: string }[]; memberships: { id: string; client_id: string; user_id: string; active: boolean }[]; resources: { id: string; project_id: string; title: string; url: string | null; description: string; kind: string }[]; projects: { id: string; client_id: string; title: string }[] };
export default function ClientAccessWorkspace() {
  const [tab,setTab]=useState("businesses"),[search,setSearch]=useState("");
  const [data, setData] = useState<AccessData | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
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
  return <div className="client-admin-workspace"><header className="control-heading"><div><p className="eyebrow">CLIENTS & BUSINESS</p><h1>Client businesses & sites</h1><p className="muted">Manage business records, client links and published resources.</p></div><Link className="button" href="/admin/accounts">People & access →</Link></header><div className="workspace-view-tabs" aria-label="Client management views"><button aria-pressed={tab==="businesses"} onClick={()=>setTab("businesses")}>Businesses</button><button aria-pressed={tab==="sites"} onClick={()=>setTab("sites")}>Published sites</button><button aria-pressed={tab==="access"} onClick={()=>setTab("access")}>Business access</button></div>{message ? <p className="account-message" role="status">{message}</p> : null}{!data ? failed ? <button onClick={() => window.location.reload()}>Retry loading client access</button> : <p>Loading client access…</p> : <>
    <section className="account-card" hidden={tab!=="businesses"}><details><summary className="client-create-toggle">Create a client business</summary><form className="form-stack" onSubmit={(event) => void createClient(event)}><p className="account-note">Check the business list below first. This creates an internal client record so you can create projects and invoices. It does not create a login, send an invitation or grant account access.</p><label className="field">Contact name<input name="fullName" required minLength={2} maxLength={160} disabled={pending} autoComplete="name" /></label><label className="field">Contact email<input name="email" type="email" required maxLength={254} disabled={pending} autoComplete="email" /></label><label className="field">Business name (optional)<input name="company" maxLength={180} disabled={pending} autoComplete="organization" /></label><button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Create business record"}</button></form></details></section>
    <section className="account-card" hidden={tab!=="businesses"}><h2>Client businesses</h2><label className="client-directory-search">Find a business<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Business, contact or email"/></label>{data.clients.length ? <div className="account-list">{data.clients.filter(client=>[client.company,client.full_name,client.email].join(" ").toLowerCase().includes(search.toLowerCase())).map((client) => <div className="account-row" key={client.id}><span><strong>{client.company || client.full_name}</strong><br /><small>{client.full_name} · {client.email}</small></span><Link href="/admin/projects">Open project delivery</Link></div>)}</div> : <p className="account-note">No business records yet. Create one above or allocate a seed from the pipeline.</p>}</section>
    <div className="client-management-panels"><section className="account-card" hidden={tab!=="access"}><h2>Link an existing client account</h2>{data.clients.length ? <form onSubmit={grant} className="form-stack"><p className="muted">For a new person, <Link href="/admin/accounts">send an invitation from People & access</Link>. Use this form to link an existing, verified account to another business.</p><label className="field">Client business<select name="clientId" required disabled={pending}>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.company ?? client.full_name} · {client.email}</option>)}</select></label><label className="field">Confirmed account email<input name="email" type="email" required maxLength={254} disabled={pending} autoComplete="off" /></label><p className="account-note">Check this person is authorised to view the selected business’s projects and invoices before granting access.</p><button className="button button-primary" disabled={pending}>Grant client access</button></form> : <p className="account-note">Create a business record above before linking a confirmed login.</p>}</section>
    <section className="account-card" hidden={tab!=="sites"}><h2>Publish a site, app or feature</h2>{data.projects.length ? <form onSubmit={resource} className="form-stack"><label className="field">Project<select name="projectId" required disabled={pending}>{data.projects.map((project) => <option key={project.id} value={project.id}>{data.clients.find((client) => client.id === project.client_id)?.company ?? data.clients.find((client) => client.id === project.client_id)?.full_name ?? "Client"} · {project.title}</option>)}</select></label><label className="field">Title<input name="title" required minLength={2} maxLength={180} disabled={pending} /></label><label className="field">Type<select name="kind" disabled={pending}><option value="website">Website</option><option value="app">App</option><option value="feature">Feature</option><option value="document">Document</option></select></label><label className="field">HTTPS link<input name="url" type="url" required pattern="https://.*" maxLength={2000} disabled={pending} /></label><label className="field">Client-visible description<textarea name="description" maxLength={2000} disabled={pending} /></label><button className="button button-primary" disabled={pending}>Publish to client dashboard</button></form> : <p className="account-note">Allocate an enquiry in the pipeline before publishing its project links.</p>}</section></div>
    <section className="account-card" hidden={tab!=="access"}><h2>Business account links</h2>{data.memberships.length ? <div className="account-list">{data.memberships.map((membership) => <div className="account-row" key={membership.id}><span><strong>{data.clients.find((client) => client.id === membership.client_id)?.company ?? data.clients.find((client) => client.id === membership.client_id)?.full_name ?? "Client"}</strong><br /><small>Account ID: {membership.user_id} · {membership.active ? "Active" : "Revoked"}</small></span>{membership.active ? <button disabled={pending} onClick={() => void mutate({ action: "revoke", membershipId: membership.id })}>Revoke access</button> : null}</div>)}</div> : <p className="account-note">No client logins have been linked yet.</p>}</section>
    <section className="account-card" hidden={tab!=="sites"}><h2>Published links & features</h2>{data.resources.length ? <div className="account-list">{data.resources.map((item) => <div className="account-row" key={item.id}><span><strong>{item.title}</strong><br /><small>{data.projects.find((project) => project.id === item.project_id)?.title} · {item.kind}</small></span><button disabled={pending} onClick={() => void mutate({ action: "remove_resource", resourceId: item.id })}>Remove from dashboard</button></div>)}</div> : <p className="account-note">No resources have been published yet.</p>}</section>
    </>}</div>;
}
