import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/request-body";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimits } from "@/lib/rate-limit";
import { botCampaignSelect, botJobSelect } from "@/lib/outreach-bot";
import { botUuidPattern, hasExactBotKeys, isBotRecord, parseBotCampaign } from "@/lib/outreach-bot-validation";

export const runtime = "nodejs";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const [campaigns, jobs] = await Promise.all([
    auth.supabase.from("outreach_bot_campaigns").select(botCampaignSelect).order("created_at", { ascending: false }).limit(100),
    auth.supabase.from("outreach_bot_jobs").select(botJobSelect).order("created_at", { ascending: false }).limit(100),
  ]);
  if (campaigns.error || jobs.error) return json({ error: "The research bot storage is unavailable." }, 503);
  return json({ campaigns: campaigns.data ?? [], jobs: jobs.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!hasAllowedStaffOrigin(request, true)) return json({ error: "Request origin is not allowed." }, 403);
  let parsed: unknown;
  try { parsed = JSON.parse(await readLimitedText(request, 48_000)); }
  catch (error) { return json({ error: "Check the campaign details." }, error instanceof RequestBodyTooLargeError ? 413 : 400); }
  const campaign = parseBotCampaign(parsed);
  if (!campaign) return json({ error: "Enter a campaign name, product, limits from 1 to 20, and unique public HTTPS sources within the site limit." }, 400);
  try {
    const service = createServiceClient();
    if (!await checkRateLimits(service, [{ scope: "outreach-bot:create", identity: auth.user.id, limit: 5, windowSeconds: 3600 }])) return json({ error: "Campaign creation limit reached. Try again later." }, 429);
    const created = await service.rpc("create_outreach_bot_campaign", {
      p_name: campaign.name, p_product_key: campaign.productKey, p_industry: campaign.industry, p_city: campaign.city,
      p_daily_limit: campaign.dailyLimit, p_max_sites: campaign.maxSites, p_sources: campaign.sources, p_created_by: auth.user.id,
    });
    if (created.error) return json({ error: created.error.code === "23505" ? "One of these sources already belongs to an active bot queue." : "The campaign could not be created. Check its limits and sources; at most ten campaigns can be active." }, ["23505", "23514", "22023"].includes(created.error.code) ? 409 : 503);
    const saved = await auth.supabase.from("outreach_bot_campaigns").select(botCampaignSelect).eq("id", created.data).maybeSingle();
    if (saved.error || !saved.data) return json({ error: "The campaign was created, but its details could not be refreshed. Reload the bot dashboard before trying again." }, 503);
    return json({ campaign: saved.data }, 201);
  } catch { return json({ error: "Campaign protection is temporarily unavailable." }, 503); }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!hasAllowedStaffOrigin(request, true)) return json({ error: "Request origin is not allowed." }, 403);
  let body: unknown;
  try { body = JSON.parse(await readLimitedText(request, 1024)); }
  catch (error) { return json({ error: "Choose a campaign and its new status." }, error instanceof RequestBodyTooLargeError ? 413 : 400); }
  if (!isBotRecord(body) || !hasExactBotKeys(body, ["id", "status"]) || typeof body.id !== "string" || !botUuidPattern.test(body.id) || (body.status !== "active" && body.status !== "paused")) return json({ error: "Choose a campaign and its new status." }, 400);
  try {
    const service = createServiceClient();
    if (!await checkRateLimits(service, [{ scope: "outreach-bot:status", identity: auth.user.id, limit: 30, windowSeconds: 3600 }])) return json({ error: "Campaign update limit reached. Try again later." }, 429);
    const updated = await service.rpc("set_outreach_bot_campaign_status", { p_id: body.id.toLowerCase(), p_status: body.status });
    if (updated.error) return json({ error: "The campaign could not be updated. At most ten campaigns can be active." }, updated.error.code === "22023" ? 409 : 503);
    if (!updated.data) return json({ error: "This campaign is unavailable or already complete. Create a new campaign to research new sources." }, 409);
    return json({ updated: true });
  } catch { return json({ error: "Campaign protection is temporarily unavailable." }, 503); }
}
