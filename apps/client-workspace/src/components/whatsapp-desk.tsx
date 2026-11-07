"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { filterOutreachProspects, getWhatsAppHandoff, normalizeWhatsAppPhone, type Prospect } from "@/lib/outreach";
import { getOutreachProduct } from "@/lib/products";
import "./whatsapp-desk.css";

export type WhatsAppDeskProps = {
  brief?: ReactNode;
  onOpenBusinessBrief: () => void;
  prospects: Prospect[];
  selectedId: string | null;
  onSelect: (prospect: Prospect) => void;
  busy: boolean;
  loading: boolean;
  unavailable?: boolean;
  businessName: string;
  phone: string;
  onPhoneChange: (phone: string) => void;
  savedProspect?: Prospect;
  unsavedChanges: boolean;
  message: string;
  onMessageChange: (message: string) => void;
  observation: string;
  onObservationChange: (observation: string) => void;
  reviewed: boolean;
  onReviewedChange: (reviewed: boolean) => void;
};

type CopyKind = "number" | "draft";
type CopyState = { context: string; kind: CopyKind; status: "copying" | "copied" | "failed" } | null;

export default function WhatsAppDesk({ brief, onOpenBusinessBrief, prospects, selectedId, onSelect, busy, loading, unavailable = false, businessName, phone, onPhoneChange, savedProspect, unsavedChanges, message, onMessageChange, observation, onObservationChange, reviewed, onReviewedChange }: WhatsAppDeskProps) {
  const [query, setQuery] = useState("");
  const [missingWebsiteOnly, setMissingWebsiteOnly] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>(null);
  const [copying, setCopying] = useState(false);
  const copyGeneration = useRef(0);
  const pendingCopy = useRef<number | null>(null);
  const mounted = useRef(false);
  const recipientInput = useRef<HTMLInputElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const handoff = getWhatsAppHandoff(savedProspect, unsavedChanges, reviewed, busy || unavailable, message);
  const canHandoff = Boolean(handoff.webUrl && handoff.appUrl);
  const normalizedNumber = normalizeWhatsAppPhone(savedProspect?.phone ?? "");
  const matches = filterOutreachProspects(prospects, query, missingWebsiteOnly);
  const copyContext = JSON.stringify([selectedId, savedProspect?.updated_at, savedProspect?.permission_status, savedProspect?.permission_note, phone, message, reviewed, unsavedChanges, busy, unavailable]);
  const currentCopy = copyState?.context === copyContext ? copyState : null;

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; copyGeneration.current += 1; pendingCopy.current = null; };
  }, []);
  // Invalidate the completion before a changed recipient commits. Keep the
  // in-flight lock until the browser settles so clipboard writes never overlap.
  useLayoutEffect(() => () => { copyGeneration.current += 1; }, [copyContext]);

  function clearCopyFeedback() {
    copyGeneration.current += 1;
    setCopyState(null);
  }

  function choose(prospect: Prospect) {
    if (busy || loading || unavailable) return;
    clearCopyFeedback();
    onSelect(prospect);
  }

  async function copy(kind: CopyKind) {
    if (!canHandoff || busy || pendingCopy.current !== null) return;
    const value = kind === "number" ? normalizedNumber ? `+${normalizedNumber}` : "" : message;
    if (!value) return;
    const generation = ++copyGeneration.current;
    pendingCopy.current = generation;
    setCopying(true);
    const context = copyContext;
    setCopyState({ context, kind, status: "copying" });
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      if (mounted.current && generation === copyGeneration.current) setCopyState({ context, kind, status: "copied" });
    } catch {
      if (!mounted.current || generation !== copyGeneration.current) return;
      setCopyState({ context, kind, status: "failed" });
      const field = kind === "number" ? recipientInput.current : messageInput.current;
      // Select only the field that still contains the reviewed value. A delayed
      // clipboard result must not move focus into a different recipient's draft.
      if (field && field.value === (kind === "number" ? phone : message)) { const disclosure = field.closest("details"); if (disclosure) disclosure.open = true; field.focus(); field.select(); }
    } finally {
      if (pendingCopy.current === generation) {
        pendingCopy.current = null;
        if (mounted.current) setCopying(false);
      }
    }
  }

  return <section className="panel whatsapp-desk" id="whatsapp-desk" aria-labelledby="whatsapp-desk-title">
    <div className="wa-desk-heading"><h2 id="whatsapp-desk-title">Outreach</h2><a className="text-link wa-sign-in" href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer">Link / open WhatsApp <span className="sr-only">(opens in a new tab)</span><span aria-hidden="true">↗</span></a></div>
    <p className="wa-handoff-note">QR sign-in opens in WhatsApp. Review the recipient and permission here; you press Send there.</p>
    <div className="wa-desk-grid">
      <aside className="wa-businesses" aria-labelledby="wa-businesses-title">
        <div className="wa-list-heading"><h3 id="wa-businesses-title">Your saved businesses</h3><span>{unavailable ? "Unavailable" : loading ? "Loading…" : `${matches.length} shown`}</span></div>
        <label className="field">Search by name, city or saved number<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} disabled={busy || loading || unavailable} maxLength={180} placeholder="Business name or +27…" autoComplete="off" aria-describedby="wa-search-help" /></label>
        <p className="micro-note" id="wa-search-help">Website not recorded appears first. Numbers in research notes stay unverified until you check and save them in the business brief.</p>
        <label className="wa-filter"><input type="checkbox" checked={missingWebsiteOnly} onChange={(event) => setMissingWebsiteOnly(event.target.checked)} disabled={busy || loading || unavailable} /><span>Only show website not recorded</span></label>
        {unavailable ? <p className="empty-state" role="status">Saved businesses could not be loaded. Reload this page to retry.</p> : loading ? <p className="empty-state" role="status">Loading saved businesses…</p> : !prospects.length ? <div className="empty-state"><p>Add your first checked business to start.</p><button className="text-link" type="button" onClick={onOpenBusinessBrief}>Add a business →</button></div> : !matches.length ? <p className="empty-state" role="status">No matching saved businesses. Try another name or number, or clear the filter.</p> : <ul className="wa-business-list" aria-label="Choose a saved business">{matches.map((prospect) => <li key={prospect.id}><button type="button" disabled={busy} aria-pressed={selectedId === prospect.id} onClick={() => choose(prospect)}><strong>{prospect.business_name}</strong><span>{prospect.city || "City not recorded"}</span><span>{prospect.phone || "WhatsApp number not recorded"}</span><small>{prospect.permission_status === "do_not_contact" ? "Do not contact" : !prospect.website.trim() ? "Website not recorded" : "Website recorded"}</small></button></li>)}</ul>}
      </aside>
      <div className="wa-composer">
        {!brief && <div className="wa-recipient-heading"><div><p className="eyebrow">SELECTED RECIPIENT</p><h3>{businessName || "Choose a saved business"}</h3></div></div>}
        <div className={brief ? "wa-offer-layout has-brief" : "wa-offer-layout"}>
        {brief}
        <div className="wa-composebody">
        <p className="wa-recipient-summary">Saved recipient: <strong>{savedProspect?.phone || "Number not yet verified"}</strong>{savedProspect && <span className="wa-recipient-product"> · {getOutreachProduct(savedProspect.product_key).name}</span>}</p>
        <button className="text-link wa-brief-link" type="button" onClick={onOpenBusinessBrief}>{unsavedChanges ? "Save changed details & permission" : "Review business & contact permission"} →</button>
        <details className="wa-recipient-details"><summary>Recipient number & observation</summary>
        <label className="field">WhatsApp number<input ref={recipientInput} type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => { clearCopyFeedback(); onPhoneChange(event.target.value); }} disabled={busy} maxLength={40} placeholder="+27…" aria-describedby="wa-recipient-help" /></label>
        <p className="micro-note" id="wa-recipient-help">Verify the business number, then save any changes and permission evidence in the business brief.</p>
        <label className="field">Your verified observation <span className="wa-optional">(optional)</span><textarea value={observation} onChange={(event) => { clearCopyFeedback(); onObservationChange(event.target.value); }} disabled={busy} maxLength={500} rows={3} placeholder="Something you checked with the business or on its website." /></label>
        </details>
        <div className="wa-message-label"><label htmlFor="wa-draft-message">Draft for your review</label><span>{message.length}/2,000</span></div>
        <textarea ref={messageInput} id="wa-draft-message" className="wa-draft-message" value={message} onChange={(event) => { clearCopyFeedback(); onMessageChange(event.target.value); }} disabled={busy} maxLength={2000} aria-describedby="wa-draft-help" spellCheck />
        <p className="sr-only" id="wa-draft-help">Editable draft. You send it manually in WhatsApp.</p>
        <label className="wa-review"><input type="checkbox" checked={reviewed} onChange={(event) => { clearCopyFeedback(); onReviewedChange(event.target.checked); }} disabled={busy} /><span>I checked the recipient, documented contact permission and message. Open this draft for my final review.</span></label>
        <p className={canHandoff ? "wa-gate-message is-ready" : "wa-gate-message"} id="wa-handoff-reason" role="status">{handoff.reason || "Ready to open as an unsent draft. Review it in WhatsApp and press Send yourself."}</p>
        <div className="wa-primary-actions">{handoff.webUrl ? <a className="button button-primary" href={handoff.webUrl} target="_blank" rel="noopener noreferrer">Open draft in WhatsApp Web <span aria-hidden="true">↗</span></a> : <button className="button button-primary" type="button" disabled aria-describedby="wa-handoff-reason">Open draft in WhatsApp Web</button>}{handoff.appUrl && <a className="button" href={handoff.appUrl} target="_blank" rel="noopener noreferrer">Use WhatsApp app <span aria-hidden="true">↗</span></a>}</div>
        <div className="wa-copy-actions"><button type="button" className="small-button" disabled={!canHandoff || copying} onClick={() => void copy("number")} aria-describedby="wa-handoff-reason">{currentCopy?.kind === "number" && currentCopy.status === "copying" ? "Copying number…" : "Copy number"}</button><button type="button" className="small-button" disabled={!canHandoff || copying} onClick={() => void copy("draft")} aria-describedby="wa-handoff-reason">{currentCopy?.kind === "draft" && currentCopy.status === "copying" ? "Copying draft…" : "Copy draft"}</button></div>
        {currentCopy && currentCopy.status !== "copying" && <p className="wa-copy-feedback" role="status">{currentCopy.status === "copied" ? `${currentCopy.kind === "number" ? "Number" : "Draft"} copied.` : `Automatic copying is unavailable. Select the ${currentCopy.kind === "number" ? "number" : "draft"} and use Copy from its menu, or press Ctrl+C / ⌘C.`}</p>}
        <p className="micro-note wa-send-boundary">Opening a draft does not mark it contacted. Update the stage after sending.</p>
        </div>
        </div>
      </div>
    </div>
  </section>;
}
