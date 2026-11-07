import { NextResponse } from "next/server";
import { hasCronAuthorization } from "@/lib/cron-auth";
import { prepareOutreach } from "@/lib/outreach-preparation";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!hasCronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET)) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  try { return NextResponse.json(await prepareOutreach(), { headers }); }
  catch { return NextResponse.json({ error: "Outreach preparation is unavailable." }, { status: 503, headers }); }
}
