"use client";
import { useEffect, useState } from "react";
import { useWorkspace } from "./workspace-runtime";
import ClientRequestCenter from "./client-request-center";
type Resource = { id: string; title: string; url: string | null; description: string; kind: string };
type Project = { id: string; title: string; status: string; progress: number; due_on: string | null; milestones: { id: string; title: string; status: string; due_on: string | null }[]; resources: Resource[] };
type Account = { client: { id: string; full_name: string; company: string | null; email: string }; projects: Project[]; invoices: { id: string; invoice_number: string; description: string; amount_cents: number; currency: string; status: string; due_on: string | null }[] };
function safeLink(value: string | null) { try { const url = new URL(value ?? ""); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; } }
const label = (value: string) => value.replaceAll("_", " ");
export default function ClientDashboard() {
  const {read,revision,online}=useWorkspace();
  const [updates,setUpdates]=useState<{id:string;title:string;summary:string;published_at:string}[]>([]);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void read<{accounts:Account[];updates:typeof updates}>("/api/account","dashboard",data=>({...data,accounts:data.accounts.map(account=>({...account,client:{...account.client,email:""},invoices:[]}))})).then(data=>{
      if(controller.signal.aborted)return;
      setAccounts(data.accounts);setUpdates(data.updates??[]);setError("");
    }).catch(failure=>{if(!controller.signal.aborted)setError(failure instanceof Error?failure.message:"Your dashboard could not be loaded.");});
    return () => controller.abort();
  }, [read,revision]);
  if (error) return <section className="account-card"><p className="account-message account-error" role="alert">{error}</p><button className="button" onClick={() => window.location.reload()}>Retry loading dashboard</button></section>;
  if (!accounts) return <p role="status">Loading your dashboard…</p>;
  if (!accounts.length) return <section className="account-card"><h2>Access pending</h2><p className="account-note">Your email is confirmed. EmberWeb still needs to link your account to your business and projects. Your details remain private while access is arranged.</p><a className="button" href="/start">Discuss your project</a></section>;
  return <><section className="account-card"><h2>Project updates</h2>{updates.length?updates.map(update=><article className="client-progress-update" key={update.id}><strong>{update.title}</strong><time>{new Date(update.published_at).toLocaleString()}</time><p>{update.summary}</p></article>):<p className="account-note">Approved progress updates will appear here as your project moves forward.</p>}{!online&&<p className="account-note">Offline project copy. Connect for current invoices and progress.</p>}</section>{accounts.map((account) => <section key={account.client.id} aria-label={account.client.company ?? account.client.full_name}>
    <div className="account-heading"><p className="eyebrow">YOUR BUSINESS</p><h2>{account.client.company ?? account.client.full_name}</h2><p className="account-note">{account.client.full_name} · {account.client.email}</p></div>
    <h2>Websites, apps & delivery</h2>
    {!account.projects.length ? <p className="account-note">Your projects will appear here once agreed with EmberWeb.</p> : <div className="account-grid">{account.projects.map((project) => <article className="account-card" key={project.id}><p className="account-status">{label(project.status)}</p><h3>{project.title}</h3><label>Delivery progress: {project.progress}%<progress className="account-progress" max={100} value={project.progress} /></label>{project.due_on ? <p className="account-note">Target date: {project.due_on}</p> : null}<h4>Milestones</h4>{project.milestones.length ? <ul>{project.milestones.map((milestone) => <li key={milestone.id}>{milestone.title} <span className="account-note">· {label(milestone.status)}{milestone.due_on ? ` · ${milestone.due_on}` : ""}</span></li>)}</ul> : <p className="account-note">Delivery milestones will appear when your plan is ready.</p>}<h4>Your sites & features</h4>{project.resources.length ? project.resources.map((resource) => { const href = safeLink(resource.url); return <div key={resource.id}><strong>{resource.title}</strong><p className="account-note">{resource.description}</p>{href ? <div className="account-links"><a href={href} target="_blank" rel="noopener noreferrer">Open {label(resource.kind)} <span className="sr-only">{resource.title} (opens in a new tab)</span><span aria-hidden="true"> ↗</span></a></div> : null}</div>; }) : <p className="account-note">Live links and feature details will be added as your project progresses.</p>}</article>)}</div>}
    <section className="account-card"><h2>Your account & invoices</h2>{account.invoices.length ? <><p className="account-note">On smaller screens, swipe across the invoice table to view all columns. Keyboard users can focus the table area and use the arrow keys.</p><div className="account-table-wrap" role="region" aria-label={`Invoices for ${account.client.company ?? account.client.full_name}`} tabIndex={0}><table className="account-table"><caption className="sr-only">Issued invoices for {account.client.company ?? account.client.full_name}</caption><thead><tr><th>Invoice</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead><tbody>{account.invoices.map((invoice) => <tr key={invoice.id}><td>{invoice.invoice_number}<p className="account-note">{invoice.description}</p></td><td>{new Intl.NumberFormat("en-ZA", { style: "currency", currency: invoice.currency }).format(invoice.amount_cents / 100)}</td><td>{label(invoice.status)}</td><td>{invoice.due_on ?? "—"}</td></tr>)}</tbody></table></div></> : <p className="account-note">You have no issued invoices to view. Agreed payment links are shared privately by EmberWeb.</p>}</section>
    <ClientRequestCenter clientId={account.client.id} projects={account.projects} />
  </section>)}</>;
}
