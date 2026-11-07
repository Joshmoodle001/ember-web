"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import RequestThread, { requestStatuses, requestStatusLabel, type ClientRequest, type RequestClient, type RequestStatus } from "./request-thread";
import "./request-center.css";

type RequestData = { requests: ClientRequest[]; clients: RequestClient[] };
export default function AdminRequests() {
  const [data, setData] = useState<RequestData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const submission = useRef<string | null>(null);
  const visible = (data?.requests ?? []).filter((request) => (!clientId || request.client_id === clientId) && (!status || request.status === status));
  const selected = visible.find((request) => request.id === selectedId);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/admin/requests", { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.requests) || !Array.isArray(result.clients)) throw new Error(typeof result.error === "string" ? result.error : "Requests could not be loaded.");
        if (!controller.signal.aborted) { setData(result as RequestData); setError(""); }
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Requests are temporarily unavailable."); }
    })();
    return () => controller.abort();
  }, [attempt]);

  async function changeStatus(nextStatus: RequestStatus) {
    if (!selected || busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: selected.id, status: nextStatus }) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Status could not be updated.");
      setNotice("Request status updated."); setAttempt((value) => value + 1);
    } catch (failure) { setNotice(failure instanceof Error ? failure.message : "Please try again later."); }
    finally { setBusy(false); }
  }

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    submission.current ??= crypto.randomUUID();
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: selected.id, body: fields.get("body"), submissionId: submission.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Reply could not be saved.");
      submission.current = null; form.reset(); setNotice("Reply saved. It is visible in the client dashboard; no external message was sent."); setAttempt((value) => value + 1);
    } catch (failure) { setNotice(failure instanceof Error ? failure.message : "Please try again later."); }
    finally { setBusy(false); }
  }

  return <div className="workspace-page request-center">
    <div className="page-heading"><div><p className="eyebrow">CLIENT SERVICE</p><h1>Requests & support</h1><p className="muted">Review client requests, record updates and reply in their dashboard. Changes and costs still need an agreed scope.</p></div></div>
    {notice ? <p className="inline-message" role="status">{notice}</p> : null}
    {error ? <section className="panel form-panel-inner" role="alert"><p>{error}</p><button className="button" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>Retry requests</button></section> : !data ? <p role="status">Loading requests…</p> : <section className="panel form-panel-inner">
      <div className="request-filters"><label className="field">Client<select value={clientId} disabled={busy} onChange={(event) => { setClientId(event.target.value); submission.current = null; }}><option value="">All clients</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.company || client.full_name}</option>)}</select></label><label className="field">Status<select value={status} disabled={busy} onChange={(event) => { setStatus(event.target.value); submission.current = null; }}><option value="">All statuses</option>{requestStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
      <p className="request-count" role="status">{visible.length} of {data.requests.length} loaded requests. Latest 100 requests, newest updates first.</p>
      {!data.requests.length ? <p className="empty-state">No client requests have been recorded yet.</p> : !visible.length ? <p className="empty-state">No requests match these filters.</p> : <div className="request-layout"><div><label className="field">Request<select value={selected?.id ?? ""} disabled={busy} onChange={(event) => { setSelectedId(event.target.value); submission.current = null; setNotice(""); }}><option value="">Choose a request</option>{visible.map((request) => <option key={request.id} value={request.id}>{request.client?.company || request.client?.full_name || "Client"} · {request.subject} · {requestStatusLabel(request.status)}</option>)}</select></label></div>
        {selected ? <div><RequestThread request={selected} /><label className="field">Update status<select value={selected.status} disabled={busy} onChange={(event) => void changeStatus(event.target.value as RequestStatus)}>{requestStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><form key={selected.id} className="form-stack" onSubmit={(event) => void reply(event)} onChange={() => { submission.current = null; }}><label className="field">Reply to the client<textarea name="body" required minLength={2} maxLength={4000} rows={4} disabled={busy || selected.status === "resolved"} /></label><p className="micro-note">This reply is visible to the client. Keep internal notes and credentials out of the conversation.</p><button className="button button-primary" disabled={busy || selected.status === "resolved"}>{busy ? "Saving…" : "Save client reply"}</button>{selected.status === "resolved" ? <p className="micro-note">Change the status to reopen this request before replying.</p> : null}</form></div> : <p className="muted">Choose a request to review its conversation.</p>}
      </div>}
    </section>}
  </div>;
}
