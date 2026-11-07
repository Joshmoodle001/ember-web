import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimits } from "@/lib/rate-limit";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/request-body";
import { hasExactBotKeys, isBotRecord } from "@/lib/outreach-bot-validation";
import { processOutreachBot } from "@/lib/outreach-bot-worker";

export const runtime = "nodejs";
export const maxDuration = 120;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!hasAllowedStaffOrigin(request, true)) return json({ error: "Request origin is not allowed." }, 403);
  try {
    const body: unknown = JSON.parse(await readLimitedText(request, 256));
    if (!isBotRecord(body) || !hasExactBotKeys(body, [])) return json({ error: "No processing options are accepted." }, 400);
  } catch (error) { return json({ error: "Send an empty processing object." }, error instanceof RequestBodyTooLargeError ? 413 : 400); }
  try {
    const service = createServiceClient();
    if (!await checkRateLimits(service, [{ scope: "outreach-bot:process", identity: auth.user.id, limit: 10, windowSeconds: 3600 }])) return json({ error: "Manual bot run limit reached. Scheduled processing remains available." }, 429);
    return json(await processOutreachBot());
  } catch { return json({ error: "The research bot could not run. Queued work remains saved." }, 503); }
}
