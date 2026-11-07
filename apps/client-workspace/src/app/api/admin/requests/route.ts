import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { handleRequestWrite } from "@/lib/client-requests";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { readLimitedText } from "@/lib/request-body";
import { checkRateLimits, getTrustedClientIp } from "@/lib/rate-limit";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  if (!auth.user.email_confirmed_at) return NextResponse.json({ error: "Confirm your account before continuing." }, { status: 403, headers });
  try {
    const { data, error } = await createServiceClient().rpc("list_client_requests", { p_actor_id: auth.user.id, p_staff: true });
    if (error || !data) return NextResponse.json({ error: "Requests could not be loaded. Please retry." }, { status: 503, headers });
    return NextResponse.json(data, { headers });
  } catch { return NextResponse.json({ error: "Requests are temporarily unavailable." }, { status: 503, headers }); }
}
async function write(request: Request) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  if (!auth.user.email_confirmed_at) return NextResponse.json({ error: "Confirm your account before continuing." }, { status: 403, headers });
  try {
    const service = createServiceClient();
    const result = await handleRequestWrite(request, {
      staff: true, actorId: auth.user.id, allowedOrigin: (incoming) => hasAllowedStaffOrigin(incoming, true), readBody: readLimitedText,
      rateLimit: () => checkRateLimits(service, [
        { scope: "requests:staff:user", identity: auth.user.id, limit: 30, windowSeconds: 60 },
        { scope: "requests:staff:ip", identity: getTrustedClientIp(request.headers) ?? "unknown", limit: 60, windowSeconds: 60 },
      ]),
      mutate: async (actorId, staff, action, payload) => await service.rpc("mutate_client_request", { p_actor_id: actorId, p_staff: staff, p_action: action, p_payload: payload }),
    });
    return NextResponse.json(result.body, { status: result.status, headers });
  } catch { return NextResponse.json({ error: "Requests are temporarily unavailable." }, { status: 503, headers }); }
}
export const POST = write;
export const PATCH = write;
