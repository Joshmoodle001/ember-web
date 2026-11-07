"use client";

import { type FormEvent, useEffect, useState } from "react";

type Meeting = { id: string; starts_at: string | null; status: string; notes: string; inquiries: { name: string; company: string | null; email: string } | null };
type MeetingData = { meetings: Meeting[]; inquiries: Array<{ id: string; name: string; company: string | null }>; bookingUrl: string | null };
const statuses = ["scheduled", "completed", "cancelled", "no_show"];

async function getMeetings(signal?: AbortSignal): Promise<MeetingData> {
  const response = await fetch("/api/admin/meetings", { cache: "no-store", signal });
  const result = await response.json() as MeetingData & { error?: string };
  if (!response.ok) throw new Error(result.error || "Meetings could not be loaded.");
  return result;
}

export default function MeetingsWorkspace() {
  const [data, setData] = useState<MeetingData | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void getMeetings(controller.signal).then((result) => { if (!controller.signal.aborted) setData(result); }).catch((error: unknown) => {
      if (!controller.signal.aborted) { setLoadError(true); setMessage(error instanceof Error ? error.message : "Meetings could not be loaded."); }
    });
    return () => controller.abort();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const localTime = String(values.get("startsAt") ?? "");
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inquiryId: values.get("inquiryId"), startsAt: new Date(localTime).toISOString(), notes: values.get("notes") }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Meeting could not be recorded.");
      setData(await getMeetings()); form.reset(); setMessage("Meeting recorded. Google Calendar remains the source for invitations and availability.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Meeting could not be recorded."); }
    finally { setBusy(false); }
  }

  async function updateStatus(id: string, status: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/meetings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Meeting could not be updated.");
      setData(await getMeetings()); setMessage("Meeting status updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Meeting could not be updated."); }
    finally { setBusy(false); }
  }

  return <div className="workspace-page">
    <div className="page-heading"><div><p className="eyebrow">DISCOVERY</p><h1>Appointments & next steps</h1><p className="muted">Clients book through your personal Google Calendar. Record the confirmed time here to keep each conversation connected to its enquiry.</p></div>{data?.bookingUrl && <a className="button button-primary" href={data.bookingUrl} target="_blank" rel="noreferrer">Open booking page ↗</a>}</div>
    {message && <p className="form-message" role="status">{message}</p>}
    <div className="two-column-layout">
      <section className="panel form-panel-inner"><p className="eyebrow">CONFIRMED APPOINTMENT</p><h2>Connect a discovery call</h2><p className="muted">This records the meeting in your workspace. It does not send an invitation or change Google Calendar.</p>
        <form className="form-stack" onSubmit={save}>
          <label className="field" htmlFor="meeting-inquiry">Project enquiry<select id="meeting-inquiry" name="inquiryId" required defaultValue="" disabled={busy}><option value="" disabled>Choose an enquiry</option>{data?.inquiries.map((inquiry) => <option key={inquiry.id} value={inquiry.id}>{inquiry.company || inquiry.name}</option>)}</select></label>
          <label className="field" htmlFor="meeting-time">Confirmed time (your local time)<input id="meeting-time" name="startsAt" type="datetime-local" required disabled={busy} /></label>
          <label className="field" htmlFor="meeting-notes">Preparation or follow-up notes<textarea id="meeting-notes" name="notes" maxLength={3000} disabled={busy} /></label>
          <button className="button button-primary" disabled={busy || !data?.inquiries.length}>{busy ? "Saving…" : "Record appointment"}</button>
        </form>
      </section>
      <section className="panel data-panel"><div className="section-heading"><h2>Discovery conversations</h2></div>
        {!data ? <p className="empty-state">{loadError ? "Appointments are temporarily unavailable. Reload to try again." : "Loading appointments…"}</p> : !data.meetings.length ? <p className="empty-state">No appointments recorded yet. Share your booking link after reviewing a brief.</p> : <div className="proposal-list">{data.meetings.map((meeting) => <article className="proposal-card" key={meeting.id}>
          <h3>{meeting.inquiries?.company || meeting.inquiries?.name || "Discovery meeting"}</h3>
          <p className="muted">{meeting.starts_at ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date(meeting.starts_at)) + " SAST" : "Time to be confirmed"}</p>
          {meeting.notes && <p className="proposal-summary">{meeting.notes}</p>}
          <label className="field compact-field" htmlFor={`meeting-${meeting.id}`}>Outcome<select id={`meeting-${meeting.id}`} value={meeting.status} disabled={busy} onChange={(event) => void updateStatus(meeting.id, event.target.value)}>{statuses.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
        </article>)}</div>}
      </section>
    </div>
  </div>;
}
