import { NextResponse } from "next/server";
import { hasCronAuthorization } from "@/lib/cron-auth";
import { processOutreachBot } from "@/lib/outreach-bot-worker";

export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!hasCronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET)) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  try { return NextResponse.json(await processOutreachBot(), { headers }); }
  catch { return NextResponse.json({ error: "The research bot is temporarily unavailable." }, { status: 503, headers }); }
}
