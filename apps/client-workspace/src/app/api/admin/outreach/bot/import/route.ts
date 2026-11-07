import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimits } from "@/lib/rate-limit";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/request-body";
import { botUuidPattern, hasExactBotKeys, isBotRecord } from "@/lib/outreach-bot-validation";

export const runtime = "nodejs";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!hasAllowedStaffOrigin(request, true)) return json({ error: "Request origin is not allowed." }, 403);
  let body: unknown;
  try { body = JSON.parse(await readLimitedText(request, 1024)); }
  catch (error) { return json({ error: "Choose a completed business result to review." }, error instanceof RequestBodyTooLargeError ? 413 : 400); }
  if (!isBotRecord(body) || !hasExactBotKeys(body, ["jobId"]) || typeof body.jobId !== "string" || !botUuidPattern.test(body.jobId)) return json({ error: "Choose a completed business result to review." }, 400);
  try {
    const service = createServiceClient();
    if (!await checkRateLimits(service, [{ scope: "outreach-bot:import", identity: auth.user.id, limit: 30, windowSeconds: 3600 }])) return json({ error: "Business review limit reached. Try again later." }, 429);
    const imported = await service.rpc("import_outreach_bot_result", { p_job_id: body.jobId.toLowerCase() });
    if (imported.error) return json({ error: imported.error.code === "22023" ? "This result is not ready or its business is marked do not contact. No business was imported." : "The reviewed business could not be saved." }, imported.error.code === "22023" ? 409 : 503);
    const result = imported.data?.[0] as { prospect_id?: string; imported?: boolean } | undefined;
    if (!result?.prospect_id) return json({ error: "The reviewed business could not be refreshed. Reload before trying again." }, 503);
    return json({ prospectId: result.prospect_id, imported: result.imported === true });
  } catch { return json({ error: "Business review protection is temporarily unavailable." }, 503); }
}
