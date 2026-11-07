import { NextResponse } from "next/server";
import { hasCronAuthorization } from "@/lib/cron-auth";
import { processWebsiteResearch } from "@/lib/website-research-worker";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!hasCronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET)) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  try { return NextResponse.json(await processWebsiteResearch(), { headers }); }
  catch { console.error("Scheduled website research unavailable."); return NextResponse.json({ error: "Website research is unavailable." }, { status: 503, headers }); }
}
