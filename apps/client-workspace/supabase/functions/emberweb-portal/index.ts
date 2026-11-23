import { timingSafeEqual } from "node:crypto";
import { aliasDomain, aliasFor, brokerFunction, dataSchema, isWorkspaceUser, memberRole, projectOrigin, workspaceId } from "../_shared/emberweb-scope.mjs";

const encoder = new TextEncoder();
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const responseHeaders = { "Cache-Control": "private, no-store" };

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: responseHeaders });
}

function authorized(request: Request) {
  const secret = Deno.env.get("EMBERWEB_PORTAL_TOKEN");
  const supplied = request.headers.get("x-emberweb-token");
  if (!secret || !supplied || !/^[a-f0-9]{64}$/.test(secret) || !/^[a-f0-9]{64}$/.test(supplied)) return false;
  return timingSafeEqual(encoder.encode(supplied), encoder.encode(secret));
}

function provider(path: string, key: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("apikey", key);
  if (key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${key}`);
  return fetch(projectOrigin + path, { ...options, headers, redirect: "error", signal: AbortSignal.timeout(12000) });
}

function jsonBody(value: unknown, method = "POST", additionalHeaders?: Record<string, string>) {
  return { method, headers: { "Content-Type": "application/json", ...additionalHeaders }, body: JSON.stringify(value) };
}

async function accountLookup(key: string, input: { p_email?: string; p_id?: string }) {
  const result = await provider("/rest/v1/rpc/workspace_auth_account", key, jsonBody(input, "POST", { "Content-Profile": dataSchema }));
  if (!result.ok) throw new Error("Account lookup failed");
  return await result.json();
}

async function account(request: Request, key: string) {
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const input = await request.json();
  const id = typeof input?.id === "string" && uuid.test(input.id) ? input.id : null;
  const email = typeof input?.email === "string" ? input.email.toLowerCase().trim() : "";
  if (input?.action === "create" || input?.action === "prepare" || input?.action === "lookup") {
    const usernameId = input.action === "create" && typeof input.provisionId === "string" && uuid.test(input.provisionId) ? input.provisionId : null;
    if (!usernameId && (!emailPattern.test(email) || email.length > 254 || email.endsWith(aliasDomain))) return response({ error: "Invalid email" }, 400);
    const authEmail = usernameId ? `${usernameId}${aliasDomain}` : await aliasFor(email);
    let existing = await accountLookup(key, { p_email: authEmail });
    if (input.action === "lookup") return response(existing);
    if (input.action === "create" && (!usernameId || typeof input.password !== "string" || input.password.length < 12 || input.password.length > 1024)) return response({ error: "Invalid account details" }, 400);
    if (!existing && (input.action === "create" || input.invite === true)) {
      const created = await provider("/auth/v1/admin/users", key, jsonBody({
        email: authEmail, role: memberRole, email_confirm: true,
        ...(usernameId ? { password: input.password } : {}),
        app_metadata: { emberweb_workspace_id: workspaceId, ...(usernameId ? { workspace_provisioning_id: usernameId } : { emberweb_email: email }) },
      }));
      existing = await accountLookup(key, { p_email: authEmail });
      if (!existing) return response({ error: "Could not create the workspace account" }, created.status === 422 ? 409 : 502);
    }
    if (input.action === "create") return response(existing);
    if (!existing) return response(null);
    const link = await provider("/auth/v1/admin/generate_link", key, jsonBody({ type: "recovery", email: existing.authEmail }));
    if (!link.ok) return response({ error: "Could not create a recovery link" }, 502);
    const data = await link.json();
    if (data.id !== existing.id || typeof data.hashed_token !== "string") return response({ error: "Invalid recovery link" }, 502);
    return response({ id: data.id, token: data.hashed_token });
  }
  if (!id) return response({ error: "Invalid workspace account" }, 400);
  const existing = await accountLookup(key, { p_id: id });
  if (!existing) return response(null);
  if (input.action === "get") return response(existing);
  const path = `/auth/v1/admin/users/${id}`;
  const current = await provider(path, key);
  const user = current.ok ? await current.json() : null;
  if (!isWorkspaceUser(user) || user.id !== id || user.email !== existing.authEmail) return response({ error: "Account unavailable" }, 404);
  if (input.action === "details" && typeof input.name === "string" && input.name.length <= 160 && typeof input.phone === "string" && input.phone.length <= 40) {
    const result = await provider(path, key, jsonBody({ user_metadata: { ...user.user_metadata, full_name: input.name, contact_phone: input.phone } }, "PUT"));
    return response({ success: result.ok }, result.ok ? 200 : 502);
  }
  if (input.action === "delete" && existing.email !== "joshmoodley01@gmail.com" && input.confirmEmail === (existing.email ?? existing.authEmail)) {
    const result = await provider(path, key, jsonBody({ should_soft_delete: true }, "DELETE"));
    return response({ success: result.ok }, result.ok ? 200 : 502);
  }
  return response({ error: "Unsupported account operation" }, 400);
}

async function database(request: Request, url: URL, resource: string, key: string) {
  const headers = new Headers();
  for (const name of ["accept", "content-type", "prefer", "range", "range-unit"]) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set("Accept-Profile", dataSchema);
  headers.set("Content-Profile", dataSchema);
  const method = request.method;
  if (!["GET", "HEAD", "POST", "PATCH", "DELETE"].includes(method) || resource === "rpc/workspace_auth_account") return response({ error: "Unsupported database operation" }, 405);
  const result = await provider("/rest/v1/" + resource + url.search, key, {
    method, headers, body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
  });
  const returnedHeaders = new Headers(responseHeaders);
  for (const name of ["content-type", "content-range", "range-unit", "preference-applied"]) {
    const value = result.headers.get(name);
    if (value !== null) returnedHeaders.set(name, value);
  }
  return new Response(result.body, { status: result.status, headers: returnedHeaders });
}

Deno.serve(async (request) => {
  if (!authorized(request)) return response({ error: "Unauthorized" }, 401);
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) return response({ error: "Workspace credentials unavailable" }, 503);
  // Preserve all other functions and schemas by handling only this function's two route groups.
  const url = new URL(request.url);
  const route = url.pathname.split(`/${brokerFunction}/`)[1];
  try {
    if (route === "account") return await account(request, key);
    const match = route?.match(/^db\/((?:rpc\/)?[a-z][a-z0-9_]*)$/);
    return match ? await database(request, url, match[1], key) : response({ error: "Not found" }, 404);
  } catch {
    return response({ error: "EmberWeb operation unavailable" }, 503);
  }
});
