"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { summarizeOutreach, type OutreachData } from "@/lib/outreach";

export default function OutreachOverview() {
  const [data, setData] = useState<OutreachData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/admin/outreach", { cache: "no-store", signal: controller.signal });
        const result = await response.json() as OutreachData & { error?: string };
        if (!response.ok) throw new Error(result.error || "Outreach results could not be loaded.");
        if (!controller.signal.aborted) setData(result);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Outreach results could not be loaded.");
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  const summary = data ? summarizeOutreach(data.prospects, data.preparations) : null;
  return <section className="panel data-panel dashboard-outreach" aria-labelledby="outreach-overview-title">
    <div className="section-heading"><div><p className="eyebrow">OUTREACH RESULTS</p><h2 id="outreach-overview-title">Your next conversations</h2><p className="muted">Review the results here, then add details and manage each business in Outreach.</p></div><Link className="button button-primary" href="/admin/outreach#business-brief">Add a business</Link></div>
    <div className="actions"><Link className="text-link" href="/admin/outreach#whatsapp-desk">Open WhatsApp review desk →</Link><Link className="text-link" href="/admin/outreach#outreach-bot">Open research bot & results →</Link><Link className="text-link" href="/admin/outreach#website-research">Individual website checks →</Link></div>
    {error ? <div className="empty-state" role="status"><p>{error}</p><button className="small-button" type="button" onClick={() => { setError(null); setAttempt((previous) => previous + 1); }}>Retry outreach</button></div> : !data || !summary ? <p className="empty-state" role="status">Loading outreach results…</p> : <>
      <dl className="outreach-summary"><div><dt>Saved prospects</dt><dd>{summary.saved}</dd></div><div><dt>Drafts to review</dt><dd>{summary.draftsToReview}</dd></div><div><dt>Replies recorded</dt><dd>{summary.replied}</dd></div><div><dt>Bookings recorded</dt><dd>{summary.booked}</dd></div></dl>
      <p className="micro-note">Based on the latest 250 saved prospects. Drafts require current details and documented permission. Replies and bookings reflect staff updates.</p>
      {data.prospects.length ? <div className="table-wrap"><table><caption className="sr-only">Five most recently updated saved prospects</caption><thead><tr><th>Business</th><th>City</th><th>Stage</th><th>Contact permission</th></tr></thead><tbody>{data.prospects.slice(0, 5).map((prospect) => <tr key={prospect.id}><td><strong>{prospect.business_name}</strong></td><td>{prospect.city || "Not recorded"}</td><td>{prospect.status.replaceAll("_", " ")}</td><td>{prospect.permission_status === "do_not_contact" ? "Do not contact" : prospect.permission_status.replaceAll("_", " ")}</td></tr>)}</tbody></table></div> : <p className="empty-state">No businesses saved yet. Add a verified business to start your outreach list.</p>}
      <div className="status-row"><Link className="text-link" href="/admin/outreach#saved-prospects">View and manage saved prospects →</Link><span className={data.lookupConfigured ? "status-pill status-ready" : "status-pill status-pending"}>{data.lookupConfigured ? "Google lookup configured" : "Google lookup awaiting connection · manual entry available"}</span></div>
    </>}
  </section>;
}
