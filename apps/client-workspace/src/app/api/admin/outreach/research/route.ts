import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimits } from "@/lib/rate-limit";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/request-body";
import { normalizeResearchUrl } from "@/lib/website-audit";
import { researchJobSelect } from "@/lib/website-research";

export const runtime = "nodejs";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const jobs = await auth.supabase.from("website_research_jobs").select(researchJobSelect).order("created_at", { ascending: false }).limit(50);
  if (jobs.error) { console.error("Research history unavailable:", jobs.error.code); return json({ error: "Website research storage is unavailable." }, 503); }
  return json({ jobs: jobs.data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!hasAllowedStaffOrigin(request)) return json({ error: "Request origin is not allowed." }, 403);
  let prospectId: string;
  try {
    const body: unknown = JSON.parse(await readLimitedText(request, 1024));
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !("prospectId" in body) || typeof body.prospectId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.prospectId)) return json({ error: "Choose a saved business to research." }, 400);
    prospectId = body.prospectId.toLowerCase();
  } catch (error) { return json({ error: "Choose a saved business to research." }, error instanceof RequestBodyTooLargeError ? 413 : 400); }
  const prospect = await auth.supabase.from("outreach_prospects").select("id,business_name,website,updated_at,permission_status").eq("id", prospectId).maybeSingle();
  if (prospect.error) return json({ error: "The saved business could not be loaded." }, 503);
  if (!prospect.data) return json({ error: "Saved business not found." }, 404);
  if (prospect.data.permission_status === "do_not_contact") return json({ error: "This business is marked do not contact." }, 409);
  let sourceUrl: string;
  try { sourceUrl = normalizeResearchUrl(prospect.data.website); }
  catch { return json({ error: "Save a public HTTPS business website before queuing a check." }, 400); }
  try {
    const service = createServiceClient();
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
    if (!await checkRateLimits(service, [{ scope: "website-research:admin", identity: auth.user.id, limit: 10, windowSeconds: 3600 }, { scope: "website-research:host", identity: host, limit: 1, windowSeconds: 3600 }])) return json({ error: "The research limit was reached. Each website can be queued once per hour." }, 429);
    const inserted = await service.from("website_research_jobs").insert({ prospect_id: prospectId, business_name: prospect.data.business_name, source_url: sourceUrl, source_updated_at: prospect.data.updated_at }).select(researchJobSelect).single();
    if (inserted.error?.code === "23505") return json({ error: "This business already has a queued or running website check." }, 409);
    if (inserted.error) { console.error("Research queue unavailable:", inserted.error.code); return json({ error: "This website check could not be queued." }, 503); }
    return json({ job: inserted.data }, 201);
  } catch { return json({ error: "Research protection is temporarily unavailable." }, 503); }
}
