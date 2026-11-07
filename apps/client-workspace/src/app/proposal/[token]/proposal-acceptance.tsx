"use client";

import { useEffect, useRef, useState } from "react";

type Props = { token: string; initialStatus: "sent" | "accepted"; acceptedAt: string | null };

export default function ProposalAcceptance({ token, initialStatus, acceptedAt }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const liveStatusRef = useRef<HTMLParagraphElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) confirmButtonRef.current?.focus();
    else if (wasConfirming.current && status === "sent") acceptButtonRef.current?.focus();
    else if (wasConfirming.current && status === "accepted") liveStatusRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming, status]);

  async function acceptProposal() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/proposal/${encodeURIComponent(token)}/accept`, { method: "POST" });
      const result = await response.json() as { status?: string; error?: string };
      if (!response.ok || result.status !== "accepted") throw new Error(result.error || "Proposal acceptance could not be recorded.");
      setStatus("accepted");
      setConfirming(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Proposal acceptance could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  const acceptedDate = acceptedAt ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "long" }).format(new Date(acceptedAt)) : null;
  const acceptedMessage = `Your acceptance has been recorded${acceptedDate ? ` on ${acceptedDate}` : ""}. EmberWeb will follow up about next steps and invoicing separately.`;

  return (
    <section className={`proposal-acceptance${status === "accepted" ? " proposal-accepted" : ""}`} aria-labelledby="proposal-acceptance-heading">
      <h2 id="proposal-acceptance-heading">{status === "accepted" ? "Proposal accepted" : "Ready to proceed?"}</h2>
      <p className="proposal-live-region" ref={liveStatusRef} role="status" aria-live="polite" aria-atomic="true" tabIndex={-1}>{status === "accepted" ? acceptedMessage : ""}</p>
      {status === "accepted" ? <p>{acceptedMessage}</p> : <>
        <p>Accepting records your approval of this proposal. It does not authorize a card charge or take payment.</p>
        {confirming ? <div className="proposal-confirm-actions">
          <button ref={confirmButtonRef} className="proposal-button proposal-button-primary" type="button" disabled={busy} onClick={() => void acceptProposal()}>{busy ? "Recording acceptance…" : "Confirm acceptance"}</button>
          <button className="proposal-button proposal-button-secondary" type="button" disabled={busy} onClick={() => setConfirming(false)}>Go back</button>
        </div> : <button ref={acceptButtonRef} className="proposal-button proposal-button-primary" type="button" disabled={busy} onClick={() => setConfirming(true)}>Accept proposal</button>}
        {message && <p className="proposal-error" role="alert">{message}</p>}
      </>}
    </section>
  );
}
