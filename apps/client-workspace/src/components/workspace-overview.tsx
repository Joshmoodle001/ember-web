"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useWorkspace } from "./workspace-runtime";
import { stageLabel, type Board } from "@/lib/workspace-model";

export default function WorkspaceOverview() {
  const { identity, read, revision } = useWorkspace();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void read<Board>("/api/admin/pipeline", "pipeline").then(data => { if (active) setBoard(data); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [read, revision]);
  const seeds = board?.seeds ?? [];
  const unassigned = seeds.filter(seed => !seed.assignee_id).length;
  const mine = seeds.filter(seed => seed.assignee_id === identity.id && seed.stage !== "live").length;
  const review = seeds.filter(seed => ["testing", "final_quality_checks"].includes(seed.stage)).length;
  const owner = identity.role === "super_admin";
  return <section>
    <header className="control-heading"><div><p className="eyebrow">{owner ? "SUPER ADMIN" : "TEAM WORKSPACE"}</p><h1>Workspace overview</h1><p className="muted">Pick up the work that needs you, or jump straight to a tool.</p></div><Link className="button button-primary" href="/admin/pipeline?new=1">+ New enquiry</Link></header>
    {error && <p className="control-notice" role="status">{error}</p>}
    <div className="overview-attention" aria-label="Project priorities">
      <Link href="/admin/pipeline?stage=starting"><span>Awaiting allocation</span><strong>{board ? unassigned : "—"}</strong><small>Review new enquiries <span aria-hidden="true">→</span></small></Link>
      <Link href="/admin/projects?assigned=mine"><span>Your active projects</span><strong>{board ? mine : "—"}</strong><small>Continue delivery <span aria-hidden="true">→</span></small></Link>
      <Link href="/admin/projects?stage=review"><span>Testing & quality review</span><strong>{board ? review : "—"}</strong><small>Check work before launch <span aria-hidden="true">→</span></small></Link>
    </div>
    {board && board.total > seeds.length && <p className="muted overview-count-note">Priority counts cover the {seeds.length} most recently updated records. Open the pipeline to load the full list.</p>}
    <div className="overview-columns"><section className="control-panel overview-recent"><header className="workspace-section-heading"><h2>Recent project work</h2><Link href="/admin/pipeline">View pipeline →</Link></header>
      {!board ? <p role="status">Loading projects…</p> : seeds.length ? <div className="workspace-compact-list">{seeds.slice(0, 5).map(seed => <Link key={seed.id} href={seed.project_id ? `/admin/projects/${seed.project_id}` : `/admin/pipeline?seed=${seed.id}`}><div><strong>{seed.title}</strong><span>{seed.contact_name}</span></div><span className="workspace-stage-label">{stageLabel(seed.stage)}</span></Link>)}</div> : <div className="workspace-empty-small"><h3>Ready for your first enquiry</h3><p>Website enquiries arrive in the pipeline. You can also capture a conversation yourself.</p><Link className="button" href="/admin/pipeline?new=1">Create an enquiry</Link></div>}
    </section><section className="control-panel overview-shortcuts"><h2>{owner ? "Manage the workspace" : "Quick access"}</h2><div className="workspace-shortcut-list">
      {owner && <><Link href="/admin/accounts"><strong>People & access</strong><span>Invite someone or manage their account →</span></Link><Link href="/admin/clients"><strong>Client businesses & sites</strong><span>Connect client records and publish resources →</span></Link><Link href="/admin/leads"><strong>Lead research</strong><span>Find businesses and review saved leads →</span></Link></>}
      <Link href="/admin/requests"><strong>Support tickets</strong><span>Read and respond to client requests →</span></Link>
      {!owner && <Link href="/admin/meetings"><strong>Appointments</strong><span>Prepare for your next client conversation →</span></Link>}
    </div></section></div>
    <div className="overview-bottom-links"><Link href="/admin/finance">Invoices & payments</Link><Link href="/admin/proposals">Proposals</Link><Link href="/admin/meetings">Appointments</Link>{owner && <Link href="/admin/activity">Activity & audit</Link>}</div>
  </section>;
}
