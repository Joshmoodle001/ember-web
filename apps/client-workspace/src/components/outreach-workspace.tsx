"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import OutreachOffer from "@/components/outreach-offer";
import "./outreach-compact.css";
import WebsiteResearch from "@/components/website-research";
import OutreachBot from "@/components/outreach-bot";
import WhatsAppDesk from "@/components/whatsapp-desk";
import { outreachProducts, type OutreachProductKey } from "@/lib/products";
import { createWhatsAppDraft, industries, type OutreachData, type PermissionStatus, type Prospect, type ProspectStatus } from "@/lib/outreach";
import type { PlacesResult } from "@/lib/google-places";

type Draft = Omit<Prospect, "id" | "created_at" | "updated_at">;
const emptyDraft: Draft = { product_key: "emberweb", business_name: "", industry: "services", city: "Johannesburg", website: "", phone: "", email: "", notes: "", permission_status: "unconfirmed", permission_note: "", status: "research" };
const statusOptions: ProspectStatus[] = ["research", "ready", "contacted", "replied", "booked", "closed"];

async function loadOutreach(signal?: AbortSignal): Promise<OutreachData> {
  const response = await fetch("/api/admin/outreach", { cache: "no-store", signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Outreach records are unavailable.");
  return body;
}

export default function OutreachWorkspace() {
  const businessBrief = useRef<HTMLDetailsElement>(null);
  function openBusinessBrief() {
    if (!businessBrief.current) return;
    businessBrief.current.open = true;
    businessBrief.current.scrollIntoView({ behavior: "auto", block: "start" });
    businessBrief.current.querySelector("summary")?.focus();
  }
  const [data, setData] = useState<OutreachData | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<PlacesResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [query, setQuery] = useState("plumbers");
  const [city, setCity] = useState("Johannesburg");
  const [observation, setObservation] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const mounted = useRef(false);
  const busyRef = useRef(false);
  const readGeneration = useRef(0);
  const activeRead = useRef<AbortController | null>(null);
  useEffect(() => {
    function revealLinkedSection() {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      let parent: HTMLElement | null = target;
      while (parent) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
        parent = parent.parentElement;
      }
      target.scrollIntoView({ block: "start", behavior: "auto" });
    }
    revealLinkedSection();
    window.addEventListener("hashchange", revealLinkedSection);
    return () => window.removeEventListener("hashchange", revealLinkedSection);
  }, []);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    const generation = ++readGeneration.current;
    activeRead.current = controller;
    void loadOutreach(controller.signal).then((value) => { if (!controller.signal.aborted && generation === readGeneration.current) setData(value); }).catch((error: unknown) => { if (!controller.signal.aborted && generation === readGeneration.current) { setLoadFailed(true); setMessage(error instanceof Error ? error.message : "Could not load outreach."); } });
    return () => { mounted.current = false; controller.abort(); activeRead.current?.abort(); };
  }, []);

  function beginAction(invalidateReads = false) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    if (invalidateReads) { activeRead.current?.abort(); ++readGeneration.current; }
    return true;
  }
  function endAction() {
    busyRef.current = false;
    if (mounted.current) setBusy(false);
  }
  function beginImport() { return beginAction(true); }

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value })); setReviewed(false); setEditMessage(null);
  }
  function selectProspect(prospect: Prospect) {
    if (busyRef.current) return;
    const { id, created_at: _created, updated_at: _updated, ...fields } = prospect;
    void _created; void _updated;
    const prepared = data?.preparations?.find((item) => item.prospect_id === id && item.source_updated_at === prospect.updated_at);
    setSelectedId(id); setDraft({ ...fields, product_key: fields.product_key ?? "emberweb" }); setObservation(""); setReviewed(false); setEditMessage(prepared?.message ?? null); setMessage(prepared ? "Loaded the prepared draft. Review the details and permission before opening WhatsApp." : "");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!beginAction(true)) return;
    setMessage("");
    try {
      const response = await fetch("/api/admin/outreach", { method: selectedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selectedId ? { ...draft, id: selectedId } : draft) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this prospect.");
      if (!mounted.current) return;
      if (result.prospect?.id) {
        const saved: Prospect = result.prospect;
        const { id: _savedId, created_at: _savedCreated, updated_at: _savedUpdated, ...savedFields } = saved;
        void _savedId; void _savedCreated; void _savedUpdated;
        setSelectedId(saved.id);
        setDraft({ ...savedFields, product_key: savedFields.product_key ?? "emberweb" });
        setReviewed(false);
        setData((previous) => previous ? { ...previous, prospects: [saved, ...previous.prospects.filter((item) => item.id !== saved.id)] } : previous);
      }
      setMessage("Prospect saved privately. No message has been sent.");
    } catch (error) { if (mounted.current) setMessage(error instanceof Error ? error.message : "Could not save this prospect."); }
    finally { endAction(); }
  }
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!beginAction()) return;
    setMessage(""); setResults([]); setSearched(false);
    try {
      const response = await fetch("/api/admin/outreach/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, city }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Google lookup is unavailable.");
      if (!mounted.current) return;
      setResults(result.results); setSearched(true);
    } catch (error) { if (mounted.current) setMessage(error instanceof Error ? error.message : "Google lookup is unavailable."); }
    finally { endAction(); }
  }
  async function prepare() {
    if (!beginAction(true)) return;
    setMessage("");
    try {
      const response = await fetch("/api/admin/outreach/prepare", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Preparation failed.");
      if (!mounted.current) return;
      setMessage(`Prepared ${result.prepared} new or updated concepts and drafts. Select a saved prospect to review. No messages were sent.`);
      try { const refreshed = await loadOutreach(); if (mounted.current) setData(refreshed); } catch { if (mounted.current) setMessage("Preparation completed, but the list could not refresh. Reload to view the prepared drafts."); }
    } catch (error) { if (mounted.current) setMessage(error instanceof Error ? error.message : "Preparation failed."); }
    finally { endAction(); }
  }
  const whatsappText = editMessage ?? createWhatsAppDraft(draft.business_name, draft.industry, observation, draft.product_key);
  const mapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query + " in " + city + ", South Africa")}`;
  const savedProspect = data?.prospects.find((prospect) => prospect.id === selectedId);
  const unsavedChanges = !savedProspect || Object.entries(draft).some(([key, value]) => (key === "product_key" ? savedProspect.product_key ?? "emberweb" : savedProspect[key as keyof Draft]) !== value);

  async function refreshImportedProspect(prospectId: string) {
    const controller = new AbortController();
    const generation = ++readGeneration.current;
    activeRead.current?.abort();
    activeRead.current = controller;
    const refreshed = await loadOutreach(controller.signal);
    if (!mounted.current || controller.signal.aborted || generation !== readGeneration.current) return;
    setData(refreshed);
    const imported = refreshed.prospects.find((item) => item.id === prospectId);
    if (imported) {
      const { id, created_at: _created, updated_at: _updated, ...fields } = imported;
      void _created; void _updated;
      setSelectedId(id); setDraft({ ...fields, product_key: fields.product_key ?? "emberweb" });
      setObservation(""); setReviewed(false); setEditMessage(null);
      setMessage("Research imported with contact permission unconfirmed. Review its source and contact details before outreach.");
    }
  }

  return <div className="workspace-page outreach-page">
    <div className="page-heading"><div><p className="eyebrow">OUTREACH STUDIO</p><h1>Your outreach, at a glance.</h1><p className="muted">Choose a business. Review its idea, price and draft. Send when ready.</p></div><a className="button" href="/demo" target="_blank" rel="noopener noreferrer">View the demo ↗</a></div>

    <WhatsAppDesk prospects={data?.prospects ?? []} selectedId={selectedId} onSelect={selectProspect} busy={busy} loading={!data && !loadFailed} unavailable={loadFailed} businessName={draft.business_name} phone={draft.phone} onPhoneChange={(value) => change("phone", value)} savedProspect={savedProspect} unsavedChanges={unsavedChanges} message={whatsappText} onMessageChange={(value) => { setEditMessage(value); setReviewed(false); }} observation={observation} onObservationChange={(value) => { setObservation(value); setReviewed(false); setEditMessage(null); }} reviewed={reviewed} onReviewedChange={setReviewed} onOpenBusinessBrief={openBusinessBrief} brief={selectedId ? <OutreachOffer key={`${selectedId}:${draft.product_key}`} businessName={draft.business_name} industry={draft.industry} productKey={draft.product_key ?? "emberweb"} website={draft.website} disabled={busy || !data} onUseDraft={(text) => { setEditMessage(text); setReviewed(false); }} /> : undefined} />
    {message && <p className="form-message" role="status">{message}</p>}
    <div className="outreach-secondary-tools">
    <details className="outreach-disclosure"><summary>Find more businesses & run the scraper</summary>
    <OutreachBot onProspectImported={refreshImportedProspect} parentBusy={busy} beginImport={beginImport} endImport={endAction} />
    <div className="booking-callout"><p>Daily background preparation updates concepts and drafts for saved, permitted prospects. New or changed records are processed once; messages always need your review.</p><button className="button" type="button" disabled={busy || !data} onClick={() => void prepare()}>Prepare saved prospects now</button></div>
    <section className="panel form-panel-inner"><p className="eyebrow">BUSINESS RESEARCH</p><h2>Look for a useful opportunity.</h2><p className="muted">Start with service businesses that handle bookings, quotes or repeated customer questions. A listing alone does not establish a need or permission to contact.</p>
      <form className="form-stack" onSubmit={search}><label className="field">Business type<input disabled={busy} value={query} onChange={(event) => setQuery(event.target.value)} required minLength={2} maxLength={120} placeholder="e.g. salons, electricians, guesthouses" /></label><label className="field">Town or city<input disabled={busy} value={city} onChange={(event) => setCity(event.target.value)} required minLength={2} maxLength={100} /></label><button className="button button-primary" disabled={busy}>{busy ? "Working…" : "Look up on Google"}</button></form>
      {data && !data.lookupConfigured && <p className="form-message">Live API lookup needs a Google Places API key in Vercel. You can research on Google Maps while that connection is being completed.</p>}
      <a className="text-link" href={mapsSearch} target="_blank" rel="noopener noreferrer">Open this search in Google Maps ↗</a><p className="micro-note"><a className="text-link" href="/outreach/terms" target="_blank" rel="noopener noreferrer">Research terms & privacy</a></p>
      {!!results.length && <div className="research-results"><p className="google-attribution">Google Maps</p>{results.map((place) => <article className="research-result" key={place.placeId}><h3>{place.name}</h3><p>{place.address}</p>{place.phone && <p>{place.phone}</p>}{place.businessStatus && <small>{place.businessStatus.replaceAll("_", " ")}</small>}<div className="actions">{place.website && <a className="text-link" href={place.website} target="_blank" rel="noopener noreferrer">Website ↗</a>}{place.mapsUrl && <a className="text-link" href={place.mapsUrl} target="_blank" rel="noopener noreferrer">Google Maps ↗</a>}</div>{place.attributions.map((attribution) => <small key={attribution}>{attribution}</small>)}</article>)}<p className="micro-note">Live research only. Google result content is not saved to your prospect list. Verify contact details independently before creating a record.</p></div>}
      {searched && !results.length && <p className="empty-state">No matching listings returned. Try a nearby city or a more specific business type.</p>}
    </section></details>
    <details className="outreach-disclosure" id="business-brief" ref={businessBrief}><summary>Business details, permission & pipeline</summary>
    <button className="small-button" type="button" disabled={busy} onClick={() => { setDraft(emptyDraft); setSelectedId(null); setReviewed(false); setEditMessage(null); setObservation(""); }}>Add a new business</button>
    <section className="panel form-panel-inner"><p className="eyebrow">BUSINESS BRIEF</p><h2>{selectedId ? "Refine this prospect" : "Add a business you’ve checked"}</h2><p className="muted">Use information supplied by the business or verified directly on its own website. Keep unsolicited prospecting separate from client enquiries.</p>
      <form className="form-stack" onSubmit={save}><fieldset className="form-fields" disabled={busy}><label className="field">Product to discuss<select value={draft.product_key ?? "emberweb"} onChange={(event) => change("product_key", event.target.value as OutreachProductKey)}>{outreachProducts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field">Business name<input value={draft.business_name} onChange={(event) => change("business_name", event.target.value)} required minLength={2} maxLength={160} /></label><div className="outreach-field-pair"><label className="field">Industry<select value={draft.industry} onChange={(event) => change("industry", event.target.value)}>{industries.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="field">City<input value={draft.city} onChange={(event) => change("city", event.target.value)} maxLength={100} /></label></div><label className="field">Website<input type="url" value={draft.website} onChange={(event) => change("website", event.target.value)} placeholder="https://" maxLength={1000} /></label><div className="outreach-field-pair"><label className="field">WhatsApp number<input type="tel" value={draft.phone} onChange={(event) => change("phone", event.target.value)} placeholder="+27…" maxLength={40} /></label><label className="field">Business email<input type="email" value={draft.email} onChange={(event) => change("email", event.target.value)} maxLength={254} /></label></div><p className="micro-note">Email format is checked. This does not verify ownership or deliverability.</p><label className="field">Research notes & independent source<textarea value={draft.notes} onChange={(event) => change("notes", event.target.value)} maxLength={3000} placeholder="What did the business tell you? Which page did you check? What useful problem might an app solve?" /></label><div className="outreach-field-pair"><label className="field">Contact permission<select value={draft.permission_status} onChange={(event) => change("permission_status", event.target.value as PermissionStatus)}><option value="unconfirmed">Not confirmed — research only</option><option value="opted_in">Opted in to this conversation</option><option value="existing_customer">Existing customer — contact permitted</option><option value="do_not_contact">Do not contact</option></select></label><label className="field">Pipeline stage<select value={draft.status} onChange={(event) => change("status", event.target.value as ProspectStatus)}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div><label className="field">Permission evidence / opt-out note<textarea value={draft.permission_note} onChange={(event) => change("permission_note", event.target.value)} maxLength={1000} placeholder="When and how was contact permission given? Record any opt-out here." /></label><button className="button button-primary" disabled={busy || !data}>{busy ? "Saving…" : "Save private prospect"}</button></fieldset></form>
    </section></details>
    <details className="outreach-disclosure"><summary>Website checks & source evidence</summary>
    <WebsiteResearch prospectId={selectedId} businessName={draft.business_name} website={draft.website} updatedAt={savedProspect?.updated_at} unsavedChanges={unsavedChanges} doNotContact={draft.permission_status === "do_not_contact"} parentBusy={busy || !data} />
    </details>
    <details className="outreach-disclosure" id="discovery-tools"><summary>Demo video & booking tools</summary>

    <section className="panel form-panel-inner"><h2>Show the idea, then book a conversation.</h2><video className="outreach-video" controls playsInline preload="none" poster="/outreach/demo-poster.jpg"><source src="/outreach/emberweb-demo.mp4" type="video/mp4" /><track kind="captions" src="/outreach/demo-captions.vtt" srcLang="en" label="English" default /></video><div className="actions"><a className="text-link" href="/outreach/emberweb-demo.mp4" download>Download demo clip</a><a className="text-link" href="/demo" target="_blank" rel="noopener noreferrer">Open demo ↗</a><a className="text-link" href="https://emberweb.co.za/book" target="_blank" rel="noopener noreferrer">Book discovery ↗</a></div><p className="micro-note">The Google Calendar booking sends the invitation and confirmation emails. Marking an appointment in the workspace does not create a Calendar event.</p></section>
    </details></div>
  </div>;
}
