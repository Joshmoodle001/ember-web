import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimits } from "@/lib/rate-limit";
import { processWebsiteResearch } from "@/lib/website-research-worker";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!hasAllowedStaffOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403, headers });
  try {
    if (!await checkRateLimits(createServiceClient(), [{ scope: "website-research:process", identity: auth.user.id, limit: 10, windowSeconds: 3600 }])) return NextResponse.json({ error: "Please wait before processing more checks." }, { status: 429, headers });
    return NextResponse.json(await processWebsiteResearch(), { headers });
  } catch { console.error("Website research processing unavailable."); return NextResponse.json({ error: "Website research processing is temporarily unavailable." }, { status: 503, headers }); }
}
