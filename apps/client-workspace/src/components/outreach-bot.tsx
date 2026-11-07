"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { botErrorMessages, type BotData, type BotJob, type BotRunSummary, type BotSourceKind } from "@/lib/outreach-bot";
import { getOutreachProduct, outreachProducts, type OutreachProductKey } from "@/lib/products";
import { industries } from "@/lib/outreach";
import "./outreach-bot.css";

function sourceLink(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname.includes(".") || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":") || /(?:^|\.)(?:localhost|local|internal|test|example|invalid)$/.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

function Source({ url, children }: { url: string; children?: React.ReactNode }) {
  const href = sourceLink(url);
  return href ? <a className="text-link bot-source" href={href} target="_blank" rel="noopener noreferrer">{children || href} ↗</a> : <span className="micro-note">Source address unavailable</span>;
}

function timestamp(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Time unavailable" : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(parsed);
}

async function readBot(signal?: AbortSignal): Promise<BotData> {
  const response = await fetch("/api/admin/outreach/bot", { cache: "no-store", signal });
  const body = await response.json() as BotData & { error?: string };
  if (!response.ok || !Array.isArray(body.campaigns) || !Array.isArray(body.jobs)) throw new Error(body.error || "The research bot could not be loaded.");
  return body;
}

type Props = {
  onProspectImported: (id: string) => Promise<void>;
  parentBusy: boolean;
  beginImport: () => boolean;
  endImport: () => void;
};

export default function OutreachBot({ onProspectImported, parentBusy, beginImport, endImport }: Props) {
  const [data, setData] = useState<BotData | null>(null);
  const [name, setName] = useState("");
  const [productKey, setProductKey] = useState<OutreachProductKey>("emberweb");
  const [industry, setIndustry] = useState("services");
  const [city, setCity] = useState("");
  const [sourceKind, setSourceKind] = useState<BotSourceKind>("business");
  const [sources, setSources] = useState("");
  const [dailyLimit, setDailyLimit] = useState(3);
  const [maxSites, setMaxSites] = useState(20);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(false);
  const mutationActive = useRef(false);
  const readGeneration = useRef(0);
  const activeRead = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; activeRead.current?.abort(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const generation = ++readGeneration.current;
    activeRead.current?.abort();
    activeRead.current = controller;
    void readBot(controller.signal).then((result) => { if (!controller.signal.aborted && generation === readGeneration.current) setData(result); }).catch((cause: unknown) => { if (!controller.signal.aborted && generation === readGeneration.current) setError(cause instanceof Error ? cause.message : "The research bot could not be loaded."); });
    return () => controller.abort();
  }, [attempt]);

  async function mutate(path: string, method: "POST" | "PATCH", payload: object, kind: "create" | "status" | "process" | "import") {
    if (mutationActive.current) return;
    const importing = kind === "import";
    if (importing && !beginImport()) { setError("Finish the current business-brief action before importing a prospect."); return; }
    mutationActive.current = true;
    activeRead.current?.abort();
    const generation = ++readGeneration.current;
    setBusy(true); setError(""); setNotice("");
    let completed = false;
    try {
      // A saved mutation continues across prospect/campaign selection changes.
      const response = await fetch(`/api/admin/outreach/bot${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as Partial<BotRunSummary> & { error?: string; prospectId?: string; imported?: boolean; campaign?: { id?: string } };
      if (!response.ok) throw new Error(result.error || "The bot action could not be completed.");
      completed = true;
      if (!mounted.current) return;
      setNotice(kind === "process" ? `Checked ${result.processed ?? 0} source(s): ${result.completed ?? 0} completed, ${result.failed ?? 0} failed, ${result.skipped ?? 0} skipped. No messages sent.` : kind === "import" ? "Research imported with contact permission unconfirmed. Review the business brief below." : kind === "status" ? "Campaign status saved. A source already being checked may finish." : "Campaign saved. Sources are queued for bounded research; no messages are sent.");
      if (kind === "create" && result.campaign?.id) setSelectedCampaign(result.campaign.id);
      const refreshed = await readBot();
      if (!mounted.current || generation !== readGeneration.current) return;
      setData(refreshed);
      if (kind === "import" && result.prospectId) await onProspectImported(result.prospectId);
    } catch (cause) {
      if (mounted.current) setError(completed ? "The action completed, but the dashboard could not refresh. Refresh results before repeating it." : cause instanceof Error ? cause.message : "The bot action could not be completed.");
    } finally {
      mutationActive.current = false;
      if (importing) endImport();
      if (mounted.current) setBusy(false);
    }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const urls = [...new Set(sources.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
    if (!urls.length || urls.length > 20 || urls.some((url) => !sourceLink(url))) { setError("Add 1–20 public HTTPS source URLs, one per line. Local, credentialed and non-HTTPS addresses are unsupported."); return; }
    void mutate("", "POST", { name, productKey, industry, city, dailyLimit, maxSites, sources: urls.map((url) => ({ url, kind: sourceKind })) }, "create");
  }
  function refresh() {
    if (mutationActive.current) return;
    activeRead.current?.abort(); ++readGeneration.current;
    setError(""); setNotice(""); setAttempt((value) => value + 1);
  }
  const campaign = data?.campaigns.find((item) => item.id === selectedCampaign);
  const jobs = data?.jobs.filter((job) => !selectedCampaign || job.campaign_id === selectedCampaign) ?? [];
  const count = (status: BotJob["status"]) => jobs.filter((job) => job.status === status).length;
  const product = getOutreachProduct(productKey);

  return <section className="panel form-panel-inner outreach-bot" id="outreach-bot" aria-labelledby="outreach-bot-title">
    <div className="section-heading"><div><p className="eyebrow">BUILT-IN RESEARCH BOT</p><h2 id="outreach-bot-title">Find businesses. Keep the evidence. Review the next step.</h2><p className="muted">Your bot checks public business websites and supported directory pages, prepares a product-specific conversation, and keeps results here.</p></div><button className="button" type="button" disabled={busy} onClick={refresh}>Refresh results</button></div>
    <p className="bot-boundary"><strong>Research automatically. Outreach after your review.</strong> No automatic WhatsApp messages, email campaigns, bookings or charges. Published contact details do not establish permission or deliverability.</p>
    <div className="bot-setup-grid"><form className="form-stack" onSubmit={create}><h3>1. Set a research campaign</h3><fieldset className="form-fields" disabled={busy || !data}><label className="field">Campaign name<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} placeholder="e.g. Durban service businesses" /></label><label className="field">Product to discuss<select value={productKey} onChange={(event) => setProductKey(event.target.value as OutreachProductKey)}>{outreachProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><p className="micro-note">{product.summary}</p><div className="outreach-field-pair"><label className="field">Industry<select value={industry} onChange={(event) => setIndustry(event.target.value)}>{industries.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="field">Town or city<input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} placeholder="Where you want to focus" /></label></div><label className="field">Source type<select value={sourceKind} onChange={(event) => setSourceKind(event.target.value as BotSourceKind)}><option value="business">Official business websites</option><option value="directory">Public directory pages with business website links</option></select></label><label className="field">Public HTTPS sources — one per line<textarea value={sources} onChange={(event) => setSources(event.target.value)} required maxLength={20000} rows={5} placeholder="https://business-website.co.za/" /></label><p className="micro-note">Up to 20 URLs. The directory option discovers external business homepage links; it does not scrape Google Maps, social networks or logged-in pages. Robots restrictions and page limits apply.</p><div className="outreach-field-pair"><label className="field">Daily source checks<input type="number" min={1} max={20} required value={dailyLimit} onChange={(event) => setDailyLimit(Number(event.target.value))} /></label><label className="field">Campaign source cap<input type="number" min={1} max={20} required value={maxSites} onChange={(event) => setMaxSites(Number(event.target.value))} /></label></div><button className="button button-primary" type="submit">Create research campaign</button></fieldset></form>
    <div className="bot-operation"><h3>2. Run and review</h3><p>Scheduled processing runs daily at <strong>08:15 South African time</strong>, checking up to three due sources across active campaigns. Daily limits are caps, not a promise that every source runs that day. Use Run next for another bounded batch.</p><p className="micro-note">Each business check reads its homepage and at most one same-site contact page. It collects public business email and telephone details from supported contact regions, with their source and observation time. It does not verify an inbox or test a recipient.</p><label className="field">Results to show<select value={selectedCampaign} disabled={busy || !data} onChange={(event) => setSelectedCampaign(event.target.value)}><option value="">All campaigns</option>{data?.campaigns.map((item) => <option key={item.id} value={item.id}>{item.name} · {getOutreachProduct(item.product_key).name} · {item.status}</option>)}</select></label>{campaign && <div className="bot-campaign-detail"><strong>{campaign.name}</strong><p>{getOutreachProduct(campaign.product_key).name} · {campaign.status}</p><p className="micro-note">Daily cap {campaign.daily_limit}; campaign cap {campaign.max_sites}. {campaign.daily_run_date ? `${campaign.daily_run_count} checks started on ${campaign.daily_run_date} (South African date).` : "No source checks started yet."}</p>{campaign.status !== "completed" && <button className="button" type="button" disabled={busy} onClick={() => void mutate("", "PATCH", { id: campaign.id, status: campaign.status === "active" ? "paused" : "active" }, "status")}>{campaign.status === "active" ? "Pause campaign" : "Resume campaign"}</button>}</div>}<button className="button button-primary" type="button" disabled={busy || !data || !data.jobs.some((job) => job.status === "queued" || job.status === "running")} onClick={() => void mutate("/process", "POST", {}, "process")}>{busy ? "Working…" : "Run next batch"}</button><p className="micro-note">Run next uses the server queue across active campaigns, independently of this result filter. Paused campaigns do not start new checks.</p></div></div>
    {(notice || error) && <p className="form-message" role="status">{error || notice}</p>}
    {!data ? <p className="empty-state" role="status">{error ? "Research bot unavailable. Use Refresh results to retry." : "Loading your research campaigns…"}</p> : <><dl className="bot-counts" aria-label="Counts in the displayed result window"><div><dt>Queued</dt><dd>{count("queued")}</dd></div><div><dt>Running</dt><dd>{count("running")}</dd></div><div><dt>Completed</dt><dd>{count("completed")}</dd></div><div><dt>Failed / skipped</dt><dd>{count("failed") + count("skipped")}</dd></div></dl><p className="micro-note">Counts reflect the latest 100 jobs shown, filtered by campaign. No sample results are included.</p>{!jobs.length ? <p className="empty-state">No research results yet. Add sources to create your first campaign.</p> : <div className="bot-results">{jobs.map((job) => {
      const result = job.result;
      const campaignProduct = getOutreachProduct(data.campaigns.find((item) => item.id === job.campaign_id)?.product_key);
      return <article className="bot-result" key={job.id}><div className="website-research-card-head"><h3>{result?.kind === "business" ? result.evidence.businessName || result.evidence.title || job.canonical_host : job.canonical_host}</h3><span className={`status-pill ${job.status === "completed" ? "status-ready" : "status-pending"}`}>{job.status}</span></div><p className="micro-note">{campaignProduct.name} · {job.seed_kind} source · {job.attempts} attempt(s) · <time dateTime={job.updated_at}>{timestamp(job.updated_at)}</time></p><Source url={job.source_url} />{job.error_code && <p className="form-message">{botErrorMessages[job.error_code] || "This check needs manual review. No outreach was sent."}</p>}{result?.kind === "directory" && <><h4>Discovered website links</h4><p className="micro-note">These are candidate business links, not verified leads. The campaign cap limits further queued checks.</p>{result.discoveredUrls.length ? <ul>{result.discoveredUrls.map((url) => <li key={url}><Source url={url} /></li>)}</ul> : <p>No supported business homepage links were discovered on this page.</p>}</>}{result?.kind === "business" && <><p>{result.evidence.description || "No homepage description was observed."}</p><h4>Evidence from checked pages</h4><ul>{result.evidence.observations.map((observation, index) => <li key={index}>{observation}</li>)}</ul><details><summary>Checked pages and contact evidence</summary><ul>{result.evidence.pageUrls.map((url) => <li key={url}><Source url={url} /></li>)}</ul>{result.evidence.contacts.length ? <ul className="bot-contacts">{result.evidence.contacts.map((contact, index) => <li key={`${contact.kind}-${index}`}><strong>{contact.kind}: {contact.value}</strong><Source url={contact.sourceUrl}>Source page</Source><span className="micro-note">Observed {timestamp(contact.observedAt)} · unverified contact</span></li>)}</ul> : <p>No supported public business email or South African phone details were observed in the checked HTML.</p>}</details><details><summary>Review {getOutreachProduct(result.suggestion.productKey).name} idea and draft</summary><p>{result.suggestion.summary}</p><ul>{result.suggestion.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul><p className="micro-note">A possibility to discuss. The bot does not know this business’s requirements or internal systems.</p><pre className="bot-draft">{result.suggestion.draft}</pre></details><div className="bot-import"><p className="micro-note">Import creates a private research prospect with contact permission unconfirmed. Review the source and details in its business brief; nothing is sent.</p><button className="button" type="button" disabled={busy || parentBusy || job.status !== "completed"} onClick={() => void mutate("/import", "POST", { jobId: job.id }, "import")}>{job.prospect_id ? "Open imported prospect" : "Review and import prospect"}</button></div></>}</article>;
    })}</div>}</>}
  </section>;
}
