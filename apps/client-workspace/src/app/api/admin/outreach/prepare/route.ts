import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prepareOutreach } from "@/lib/outreach-preparation";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const headers = { "Cache-Control": "private, no-store" };
  if (!hasAllowedStaffOrigin(request)) return NextResponse.json({ error: "Origin not allowed." }, { status: 403, headers });
  try { return NextResponse.json(await prepareOutreach(), { headers }); }
  catch { return NextResponse.json({ error: "Drafts could not be prepared." }, { status: 503, headers }); }
}
