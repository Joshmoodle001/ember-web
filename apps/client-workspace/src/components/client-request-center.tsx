"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import RequestThread, { requestStatusLabel, type ClientRequest } from "./request-thread";
import "./request-center.css";

type ProjectChoice = { id: string; title: string };
export default function ClientRequestCenter({ clientId, projects }: { clientId: string; projects: ProjectChoice[] }) {
  const [requests, setRequests] = useState<ClientRequest[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const submission = useRef<string | null>(null);
  const replySubmission = useRef<string | null>(null);
  const selected = requests?.find((request) => request.id === selectedId);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/account/requests?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.requests)) throw new Error(typeof result.error === "string" ? result.error : "Requests could not be loaded.");
        if (!controller.signal.aborted) { setRequests((result.requests as ClientRequest[]).filter((request) => request.client_id === clientId)); setError(""); }
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Requests are temporarily unavailable."); }
    })();
    return () => controller.abort();
  }, [clientId, attempt]);

  async function send(event: FormEvent<HTMLFormElement>, action: "create" | "reply") {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const identity = action === "create" ? submission : replySubmission;
    identity.current ??= crypto.randomUUID();
    const payload = action === "create"
      ? { action, clientId, projectId: fields.get("projectId") || null, subject: fields.get("subject"), description: fields.get("description"), submissionId: identity.current }
      : { action, requestId: selectedId, body: fields.get("body"), submissionId: identity.current };
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/account/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Your request could not be saved.");
      identity.current = null;
      form.reset();
      if (typeof result.requestId === "string") setSelectedId(result.requestId);
      setNotice(action === "create" ? "Request saved. EmberWeb will review it here. Additional work and costs need a separate agreement." : "Reply saved to your request.");
      setAttempt((value) => value + 1);
    } catch (failure) { setNotice(failure instanceof Error ? failure.message : "Please try again later."); }
    finally { setBusy(false); }
  }

  return <section className="account-card request-center" aria-labelledby={`requests-${clientId}`}>
    <h2 id={`requests-${clientId}`}>Requests & support</h2><p className="account-note">Ask for a change, report a problem or discuss your account. A request does not approve additional costs or change your agreed project scope.</p>
    <details className="request-create"><summary>Send a new request</summary><form className="form-stack" onSubmit={(event) => void send(event, "create")} onChange={() => { submission.current = null; }}>
      <label className="field">Project<select name="projectId" disabled={busy}><option value="">General account request</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}</select></label>
      <label className="field">Subject<input name="subject" required minLength={2} maxLength={160} disabled={busy} /></label>
      <label className="field">What do you need?<textarea name="description" required minLength={2} maxLength={4000} rows={4} disabled={busy} /></label>
      <button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Send request"}</button>
    </form></details>
    {notice ? <p className="account-message" role="status">{notice}</p> : null}
    {error ? <div role="alert"><p>{error}</p><button className="button" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>Retry loading requests</button></div> : requests === null ? <p role="status">Loading requests…</p> : !requests.length ? <p className="account-note">No requests recorded for this business yet.</p> : <div className="request-layout">
      <div><label className="field">Your requests<select value={selectedId} disabled={busy} onChange={(event) => { setSelectedId(event.target.value); replySubmission.current = null; setNotice(""); }}><option value="">Choose a request</option>{requests.map((request) => <option key={request.id} value={request.id}>{request.subject} · {requestStatusLabel(request.status)}</option>)}</select></label><p className="account-note">The latest 100 accessible requests are loaded across your businesses. This list shows those for this business.</p></div>
      {selected ? <div><RequestThread request={selected} />{selected.status === "resolved" ? <p className="account-note">This request is resolved. Send a new request if you need more help.</p> : <form key={selected.id} className="form-stack" onSubmit={(event) => void send(event, "reply")} onChange={() => { replySubmission.current = null; }}><label className="field">Add a reply<textarea name="body" rows={3} required minLength={2} maxLength={4000} disabled={busy} /></label><button className="button" disabled={busy}>{busy ? "Saving…" : "Send reply"}</button></form>}</div> : <p className="account-note">Choose a request to read the conversation.</p>}
    </div>}
  </section>;
}
