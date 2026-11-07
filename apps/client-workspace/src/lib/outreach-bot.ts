import type { BusinessCrawlEvidence } from "./business-crawler";

export type BotProductKey = "emberweb" | "biosync";
export type BotCampaignStatus = "active" | "paused" | "completed";
export type BotJobStatus = "queued" | "running" | "completed" | "failed" | "skipped";
export type BotSourceKind = "business" | "directory";
export type BotCampaign = {
  id: string; name: string; product_key: BotProductKey; industry: string; city: string;
  status: BotCampaignStatus; daily_limit: number; max_sites: number;
  daily_run_date: string | null; daily_run_count: number; created_at: string; updated_at: string;
};
export type BotResult = {
  kind: "business"; evidence: BusinessCrawlEvidence;
  suggestion: { productKey: BotProductKey; summary: string; capabilities: string[]; draft: string; requiresHumanReview: true };
} | { kind: "directory"; sourceUrl: string; checkedAt: string; discoveredUrls: string[] };
export type BotJob = {
  id: string; campaign_id: string; seed_kind: BotSourceKind; source_url: string; canonical_host: string;
  status: BotJobStatus; attempts: number; result: BotResult | null; error_code: string | null;
  prospect_id: string | null; created_at: string; updated_at: string; finished_at: string | null;
  available_at: string;
};
export type BotData = { campaigns: BotCampaign[]; jobs: BotJob[] };
export type BotRunSummary = { processed: number; completed: number; failed: number; skipped: number; messagesSent: 0 };
export const botCampaignSelect = "id,name,product_key,industry,city,status,daily_limit,max_sites,daily_run_date,daily_run_count,created_at,updated_at";
export const botJobSelect = "id,campaign_id,seed_kind,source_url,canonical_host,status,attempts,result,error_code,prospect_id,created_at,updated_at,finished_at,available_at";
export const botErrorMessages: Record<string, string> = {
  robots_denied: "This source does not permit automated research.",
  unsafe_target: "This source requires a supported public HTTPS address.",
  fetch_failed: "The website could not be reached. Review it manually or add it to a later campaign.",
  too_large: "The page exceeds this bot's lightweight page limit.",
  unsupported_content: "The source did not return a supported page.",
  timeout: "The source did not respond within the research time limit.",
  do_not_contact: "Research was skipped because this business is marked do not contact.",
  campaign_paused: "The campaign is paused. Resume it to process queued sources.",
  attempt_limit: "This source reached the retry limit. Review it manually.",
};
