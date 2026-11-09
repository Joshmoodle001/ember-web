import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/client-account";
import { checkRateLimits } from "@/lib/rate-limit";
import { readLimitedText } from "@/lib/request-body";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { createServiceClient } from "@/lib/supabase/service";

const headers = { "Cache-Control": "private, no-store" };
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers });

// A client login is created only by an already authenticated workspace admin.
export async function POST(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin.ok) return admin.response;
  if (!admin.user.email_confirmed_at) return fail("A confirmed staff account is required.", 403);
  if (!hasAllowedStaffOrigin(request, true)) return fail("Request could not be completed.", 403);
  let body: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(await readLimitedText(request, 4096));
    if (!value || typeof value !== "object" || Array.isArray(value)) return fail("Invalid request.");
    body = value as Record<string, unknown>;
  } catch { return fail("Invalid request."); }
  if (Object.keys(body).some((key) => !["operationId", "clientId", "username", "password"].includes(key)) ||
      !isUuid(body.operationId) || !isUuid(body.clientId) || typeof body.username !== "string" ||
      !/^[A-Za-z][A-Za-z0-9._-]{2,31}$/.test(body.username.trim()) ||
      typeof body.password !== "string" || body.password.length < 12 || body.password.length > 1024) {
    return fail("Choose a client, username and a password of at least 12 characters.");
  }
  const username = body.username.trim().toLowerCase();
  const { data: client, error: clientError } = await admin.supabase.from("clients").select("id").eq("id", body.clientId).maybeSingle();
  if (clientError || !client) return fail("Client not found or not accessible.", 404);
  const service = createServiceClient();
  try {
    if (!await checkRateLimits(service, [{ scope: "admin:provision", identity: admin.user.id, limit: 10, windowSeconds: 3600 }])) return fail("Please wait before creating another login.", 429);
    const reservation = await service.rpc("reserve_client_login", { p_operation: body.operationId, p_actor: admin.user.id, p_client: body.clientId, p_username: username });
    if (reservation.error) {
      // A server-reported SQL exception rolls back the reservation transaction.
      // Transport and other errors may have occurred after commit and stay ambiguous.
      if (["23505", "P0001"].includes(reservation.error.code)) {
        return NextResponse.json({ error: "Username unavailable or request could not be reserved.", noReservation: true }, { status: 409, headers });
      }
      return fail("Account creation could not be confirmed. Retry this request with the same details.", 503);
    }
    if (reservation.data === true) return NextResponse.json({ success: true, recovered: true }, { headers });
    const email = `${body.operationId}@login.emberweb.invalid`;
    const created = await service.auth.admin.createUser({ email, password: body.password, email_confirm: true, app_metadata: { workspace_provisioning_id: body.operationId } });
    let user = created.data.user;
    let recovered = false;
    if (created.error || !user) {
      // A timeout may have happened after creation. Only reuse an exact,
      // server-marked account; never attach an arbitrary existing identity.
      for (let page = 1; page <= 20 && !user; page++) {
        const result = await service.auth.admin.listUsers({ page, perPage: 100 });
        if (result.error) return fail("Account creation needs staff review before retrying.", 503);
        user = result.data.users.find((item) => item.email === email && item.app_metadata?.workspace_provisioning_id === body.operationId) ?? null;
        if (result.data.users.length < 100) break;
      }
      if (!user) return fail("Account creation could not be confirmed. Check the account list before retrying.", 503);
      recovered = true;
    }
    const finished = await service.rpc("finish_client_login", { p_operation: body.operationId, p_actor: admin.user.id, p_user: user.id });
    if (finished.error) return fail("Account created, but access could not be linked. Retry this same request or contact support.", 503);
    return NextResponse.json({ success: true, recovered }, { headers });
  } catch {
    return fail("Account creation could not be confirmed. Check the account list before retrying.", 503);
  }
}
