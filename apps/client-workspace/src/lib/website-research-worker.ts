import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { auditWebsite, normalizeResearchUrl, WebsiteAuditError } from "@/lib/website-audit";
import type { ResearchJob, ResearchStatus, WebsiteEvidence } from "@/lib/website-research";

export async function processWebsiteResearch() {
  const service = createServiceClient();
  const claimed = await service.rpc("claim_website_research");
  if (claimed.error) throw new Error("Research storage is unavailable.");
  const job = (claimed.data as Array<ResearchJob & { lease_token: string }> | null)?.[0];
  if (!job) return { processed: 0, messagesSent: 0 };
  let status: ResearchStatus = "completed";
  let result: WebsiteEvidence | null = null;
  let errorCode: string | null = null;
  try {
    const prospect = await service.from("outreach_prospects").select("website,updated_at,permission_status,archived_at").eq("id", job.prospect_id).maybeSingle();
    if (prospect.error) throw new Error("Research storage is unavailable.");
    if (!prospect.data || prospect.data.archived_at) { status = "skipped"; errorCode = "prospect_unavailable"; }
    else if (prospect.data.permission_status === "do_not_contact") { status = "skipped"; errorCode = "do_not_contact"; }
    else if (prospect.data.updated_at !== job.source_updated_at || normalizeResearchUrl(prospect.data.website) !== job.source_url) { status = "skipped"; errorCode = "prospect_changed"; }
    else result = await auditWebsite(job.source_url);
  } catch (error) {
    status = "failed";
    errorCode = error instanceof WebsiteAuditError ? error.code : "fetch_failed";
  }
  const finished = await service.from("website_research_jobs").update({ status, result, error_code: errorCode, finished_at: new Date().toISOString(), updated_at: new Date().toISOString(), lease_token: null, lease_expires_at: null }).eq("id", job.id).eq("lease_token", job.lease_token).eq("status", "running").select("id").maybeSingle();
  if (finished.error) throw new Error("Research results could not be saved.");
  return { processed: finished.data ? 1 : 0, ...(finished.data ? { status } : {}), messagesSent: 0 };
}
