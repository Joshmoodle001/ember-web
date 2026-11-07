import type { WebsiteEvidence } from "./website-audit";
export type { WebsiteEvidence } from "./website-audit";
export type ResearchStatus = "queued" | "running" | "completed" | "failed" | "skipped";
export type ResearchJob = {
  id: string; prospect_id: string; business_name: string; source_url: string;
  source_updated_at: string; status: ResearchStatus; attempts: number;
  result: WebsiteEvidence | null; error_code: string | null;
  created_at: string; updated_at: string; finished_at: string | null;
};
export const researchJobSelect = "id,prospect_id,business_name,source_url,source_updated_at,status,attempts,result,error_code,created_at,updated_at,finished_at";
export const researchErrorMessages: Record<string, string> = {
  robots_denied: "This website does not permit this automated check.",
  unsafe_target: "This check requires a public HTTPS website with a supported address.",
  fetch_failed: "The website could not be checked. Review it manually or queue it again later.",
  too_large: "The page exceeds the size supported by this lightweight check.",
  unsupported_content: "This website did not return a supported HTML page.",
  timeout: "The website did not respond within the check's time limit.",
  prospect_changed: "The saved business changed after this check was queued. Queue its current details again.",
  do_not_contact: "Research was skipped because this business is marked do not contact.",
  prospect_unavailable: "The saved business is no longer available.",
  attempt_limit: "This check reached its retry limit. Review the website manually before queuing again.",
};
