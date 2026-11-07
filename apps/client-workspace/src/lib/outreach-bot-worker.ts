import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { crawlBusinessWebsite, discoverBusinessWebsites } from "@/lib/business-crawler";
import { normalizeResearchUrl, WebsiteAuditError } from "@/lib/website-audit";
import { getOutreachProduct } from "@/lib/products";
import { createWhatsAppDraft } from "@/lib/outreach";
import type { BotCampaign, BotJob, BotJobStatus, BotResult, BotRunSummary } from "@/lib/outreach-bot";

type LeasedJob = BotJob & { lease_token: string };
const MAX_JOBS = 3;
const RUN_DEADLINE_MS = 100_000;
const MINIMUM_JOB_BUDGET_MS = 35_000;

/** Durable queue work only. No provider messages, payments, bookings, or CRM imports. */
export async function processOutreachBot(): Promise<BotRunSummary> {
  const started = Date.now();
  const summary: BotRunSummary = { processed: 0, completed: 0, failed: 0, skipped: 0, messagesSent: 0 };
  const service = createServiceClient();
  for (let index = 0; index < MAX_JOBS && Date.now() - started <= RUN_DEADLINE_MS - MINIMUM_JOB_BUDGET_MS; index += 1) {
    const claimed = await service.rpc("claim_outreach_bot_job");
    if (claimed.error) throw new Error("Bot research storage is unavailable.");
    const job = (claimed.data as LeasedJob[] | null)?.[0];
    if (!job) break;
    let status: Extract<BotJobStatus, "completed" | "failed" | "skipped"> = "completed";
    let result: BotResult | null = null;
    let errorCode: string | null = null;
    let discoveredUrls: string[] = [];
    try {
      const campaignRead = await service.from("outreach_bot_campaigns").select("id,product_key,industry,status").eq("id", job.campaign_id).maybeSingle();
      if (campaignRead.error) throw new Error("Bot research storage is unavailable.");
      const campaign = campaignRead.data as Pick<BotCampaign, "id" | "product_key" | "industry" | "status"> | null;
      if (!campaign || campaign.status !== "active") {
        status = "skipped"; errorCode = "campaign_paused";
      } else {
        const suppression = await service.rpc("outreach_bot_source_suppressed", { p_source_url: job.source_url });
        if (suppression.error || typeof suppression.data !== "boolean") throw new Error("Contact suppression is unavailable.");
        if (suppression.data) { status = "skipped"; errorCode = "do_not_contact"; }
        else if (job.seed_kind === "directory") {
          const discovery = await discoverBusinessWebsites(job.source_url);
          discoveredUrls = [...new Set(discovery.discoveredUrls.map((url) => normalizeResearchUrl(url)))].slice(0, 20);
          result = { kind: "directory", sourceUrl: discovery.sourceUrl, checkedAt: discovery.checkedAt, discoveredUrls };
        } else {
          const evidence = await crawlBusinessWebsite(job.source_url);
          const product = getOutreachProduct(campaign.product_key);
          result = {
            kind: "business", evidence,
            suggestion: {
              productKey: campaign.product_key, summary: product.summary, capabilities: [...product.capabilities],
              draft: createWhatsAppDraft(evidence.businessName || evidence.title || job.canonical_host, campaign.industry, "", campaign.product_key),
              requiresHumanReview: true,
            },
          };
        }
      }
      if (result && Buffer.byteLength(JSON.stringify(result), "utf8") > 32_000) throw new WebsiteAuditError("too_large");
    } catch (error) {
      status = "failed";
      result = null;
      discoveredUrls = [];
      errorCode = error instanceof WebsiteAuditError ? error.code : "fetch_failed";
    }
    // Publication, suppression recheck, pause/lease checks, retries and directory
    // child creation are one transaction, so stale workers cannot publish results.
    const finished = await service.rpc("finish_outreach_bot_job", {
      p_id: job.id, p_lease_token: job.lease_token, p_status: status,
      p_result: result, p_error_code: errorCode, p_discovered_urls: discoveredUrls,
    });
    if (finished.error) throw new Error("Bot research results could not be saved.");
    if (finished.data === "lost_lease") continue;
    if (!["completed", "failed", "skipped", "queued"].includes(finished.data as string)) throw new Error("Bot completion was not confirmed.");
    summary.processed += 1;
    if (finished.data === "completed") summary.completed += 1;
    else if (finished.data === "skipped") summary.skipped += 1;
    else summary.failed += 1; // Includes a failed attempt queued for a bounded retry.
  }
  return summary;
}
