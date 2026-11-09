import { workspaceIdentity } from "@/lib/workspace-identity";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { handleRequestWrite } from "@/lib/client-requests";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { readLimitedText } from "@/lib/request-body";
import { checkRateLimits, getTrustedClientIp } from "@/lib/rate-limit";
const headers = { "Cache-Control": "private, no-store" };
async function clientIdentity() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return !error && data.user?.email_confirmed_at && (await workspaceIdentity(data.user.id))?.role==="client" ? data.user : null;
}
export async function GET() {
  try {
    const user = await clientIdentity();
    if (!user) return NextResponse.json({ error: "Sign in with your confirmed account." }, { status: 401, headers });
    const { data, error } = await createServiceClient().rpc("list_client_requests", { p_actor_id: user.id, p_staff: false });
    if (error || !data) return NextResponse.json({ error: "Requests could not be loaded. Please retry." }, { status: 503, headers });
    return NextResponse.json(data, { headers });
  } catch { return NextResponse.json({ error: "Requests are temporarily unavailable." }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  try {
    const user = await clientIdentity();
    if (!user) return NextResponse.json({ error: "Sign in with your confirmed account." }, { status: 401, headers });
    const service = createServiceClient();
    const result = await handleRequestWrite(request, {
      staff: false, actorId: user.id, allowedOrigin: (incoming) => hasAllowedStaffOrigin(incoming, true), readBody: readLimitedText,
      rateLimit: () => checkRateLimits(service, [
        { scope: "requests:client:user", identity: user.id, limit: 10, windowSeconds: 60 },
        { scope: "requests:client:ip", identity: getTrustedClientIp(request.headers) ?? "unknown", limit: 30, windowSeconds: 60 },
      ]),
      mutate: async (actorId, staff, action, payload) => await service.rpc("mutate_client_request", { p_actor_id: actorId, p_staff: staff, p_action: action, p_payload: payload }),
    });
    return NextResponse.json(result.body, { status: result.status, headers });
  } catch { return NextResponse.json({ error: "Requests are temporarily unavailable." }, { status: 503, headers }); }
}
