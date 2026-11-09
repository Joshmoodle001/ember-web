export const seedStages = ["starting", "allocated", "discussion", "development", "building", "testing", "final_quality_checks", "live"] as const;
export type SeedStage = typeof seedStages[number];
export type WorkspaceRole = "super_admin" | "admin" | "client";
export type WorkspaceIdentity = { id: string; email: string; role: WorkspaceRole };
export type Seed = { id: string; title: string; contact_name: string; email: string; brief: string; stage: SeedStage; version: number; assignee_id: string | null; project_id: string | null; client_id: string | null; created_at: string; updated_at: string };
export type SeedUpdate = { id: string; seed_id: string; actor_kind: string; actor_id: string; internal_body: string; client_summary: string | null; published_at: string | null; created_at: string };
export type ProjectAgent = { id: string; label: string; expires_at: string; revoked_at: string | null; last_used_at: string | null };
export type SeedCard = { seed: Seed | null; updates: SeedUpdate[]; agents: ProjectAgent[] };
export type Board = { identity: WorkspaceIdentity; seeds: Seed[]; staff: { id: string; email: string; role: string }[]; total: number };
export const stageLabel = (stage: string) => stage === "final_quality_checks" ? "Final quality checks" : stage.charAt(0).toUpperCase() + stage.slice(1).replaceAll("_", " ");
const uuid = (value: unknown) => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const text = (value: unknown, min: number, max: number) => typeof value === "string" && value.trim().length >= min && value.length <= max && !value.includes("\0");
export function validSeedCommand(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  if (!uuid(p.submissionId)) return false;
  if (p.action === "create") return text(p.title,2,180) && text(p.contactName,2,160) && text(p.brief,2,5000) && text(p.email,3,254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.email)) && (!p.clientId || uuid(p.clientId));
  if (!uuid(p.seedId)) return false;
  if (p.action === "claim") return true;
  if (p.action === "comment") return text(p.body,2,8000) && (p.clientSummary == null || p.clientSummary === "" || text(p.clientSummary,2,3000));
  if (p.action === "publish") return uuid(p.updateId) && text(p.clientSummary,2,3000);
  if (p.action === "revoke_agent") return uuid(p.agentId);
  if (!Number.isInteger(p.version) || Number(p.version)<1) return false;
  if (p.action === "edit") return text(p.title,2,180) && text(p.brief,2,5000);
  if (p.action === "reassign") return uuid(p.assigneeId);
  return p.action === "stage" && seedStages.slice(1).includes(p.stage as Exclude<SeedStage,"starting">) && Number.isInteger(p.progress) && Number(p.progress)>=0 && Number(p.progress)<=100;
}
export function validAgentUpdate(value: unknown): value is Record<string,unknown> {
  if(!value || typeof value!=="object" || Array.isArray(value)) return false;
  const p=value as Record<string,unknown>;
  return Object.keys(p).every(k=>["submissionId","body","clientSummary","stage","version"].includes(k)) && uuid(p.submissionId) && text(p.body,2,8000) && (p.clientSummary == null || text(p.clientSummary,2,3000)) && (p.stage == null || (seedStages.slice(1).includes(p.stage as Exclude<SeedStage,"starting">) && Number.isInteger(p.version) && Number(p.version)>0));
}
