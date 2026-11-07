import "server-only";
import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import ProposalAcceptance from "./proposal-acceptance";
import "./proposal.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Proposal review · EmberWeb",
  description: "Review an EmberWeb project proposal.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Proposal = {
  title: string;
  summary: string;
  proposal_url: string | null;
  amount_cents: number;
  currency: string;
  status: "sent" | "accepted";
  version: number;
  sent_at: string;
  accepted_at: string | null;
  expires_at: string;
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(cents / 100);
}

function safeDocumentUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function ClientProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return <main className="proposal-shell"><p className="proposal-eyebrow">EMBERWEB · CLIENT PROPOSAL</p><section className="proposal-panel"><h1>Review is temporarily unavailable</h1><p className="proposal-muted">Please contact EmberWeb to request this proposal again.</p></section></main>;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await supabase.rpc("get_proposal_for_review", { p_token_hash: tokenHash }).maybeSingle();
  if (error) {
    console.error("Proposal review lookup failed:", error.code);
    return <main className="proposal-shell"><p className="proposal-eyebrow">EMBERWEB · CLIENT PROPOSAL</p><section className="proposal-panel"><h1>Review is temporarily unavailable</h1><p className="proposal-muted">Please try again shortly or contact EmberWeb for assistance.</p></section></main>;
  }
  if (!data) notFound();

  const proposal = data as Proposal;
  const documentUrl = safeDocumentUrl(proposal.proposal_url);

  return (
    <main className="proposal-shell">
      <header className="proposal-header">
        <a className="proposal-brand" href="https://emberweb.co.za/">EMBER<span>WEB</span></a>
        <span className="proposal-header-label">Client proposal</span>
      </header>
      <article className="proposal-panel">
        <div className="proposal-title-row">
          <div><p className="proposal-eyebrow">PROJECT PROPOSAL · V{proposal.version}</p><h1>{proposal.title}</h1></div>
          <span className={`proposal-state proposal-state-${proposal.status}`}>{proposal.status === "accepted" ? "Accepted" : "For review"}</span>
        </div>
        <div className="proposal-total"><span>Proposed total</span><strong>{formatAmount(proposal.amount_cents, proposal.currency)}</strong></div>
        <section className="proposal-scope" aria-labelledby="proposal-scope-heading">
          <h2 id="proposal-scope-heading">Scope and terms</h2>
          <p>{proposal.summary}</p>
        </section>
        {documentUrl && <a className="proposal-document-link" href={documentUrl} target="_blank" rel="noreferrer">Open supporting proposal document ↗</a>}
        <ProposalAcceptance token={token} initialStatus={proposal.status} acceptedAt={proposal.accepted_at} />
      </article>
      <footer className="proposal-footer-note">This link is private. Acceptance records your proposal decision only; it does not charge a payment method. Any invoice and payment are handled separately.</footer>
    </main>
  );
}
