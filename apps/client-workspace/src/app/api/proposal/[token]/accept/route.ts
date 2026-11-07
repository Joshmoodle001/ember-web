import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimits, getTrustedClientIp } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return NextResponse.json({ error: "This proposal link is invalid or expired." }, { status: 404 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
    const clientIp = getTrustedClientIp(request.headers);
    const checks = [
      { scope: "proposal:accept:token", identity: tokenHash, limit: 5, windowSeconds: 3600 },
      ...(clientIp ? [{ scope: "proposal:accept:ip", identity: clientIp, limit: 20, windowSeconds: 3600 }] : []),
    ];
    if (!await checkRateLimits(supabase, checks)) {
      return NextResponse.json({ error: "Please wait before trying again." }, {
        status: 429,
        headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
      });
    }
  } catch {
    return NextResponse.json({ error: "Proposal acceptance is temporarily unavailable." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("accept_proposal_with_token", { p_token_hash: tokenHash });
  if (error) {
    console.error("Proposal acceptance failed:", error.code);
    return NextResponse.json({ error: "Proposal acceptance is temporarily unavailable." }, { status: 503 });
  }
  if (data !== "accepted") {
    return NextResponse.json({ error: "This proposal link is invalid or expired." }, {
      status: 404,
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  }

  return NextResponse.json({ status: "accepted" }, {
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
