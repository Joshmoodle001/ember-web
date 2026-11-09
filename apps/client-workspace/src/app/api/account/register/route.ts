import { NextResponse } from "next/server";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!hasAllowedStaffOrigin(request, true)) return NextResponse.json({ error: "Request not permitted." }, { status: 403, headers });
  return NextResponse.json({ error: "Client accounts are invitation only. Contact EmberWeb to arrange access." }, { status: 403, headers });
}
