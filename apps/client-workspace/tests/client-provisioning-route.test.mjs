import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const operation = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const actorId = "44444444-4444-4444-8444-444444444444";

async function route(options = {}) {
  const calls = [];
  const identity = { id: userId, email: `${operation}@login.emberweb.invalid`, app_metadata: { workspace_provisioning_id: operation } };
  const service = {
    rpc: async (name, args) => { calls.push([name, args]); return name === "reserve_client_login" ? { data: options.completed ?? false, error: options.reserveError ?? null } : { error: options.finishError ?? null }; },
    auth: { admin: {
      createUser: async (attributes) => { calls.push(["createUser", attributes]); return options.createError ? { data: { user: null }, error: {} } : { data: { user: identity }, error: null }; },
      listUsers: async () => { calls.push(["listUsers"]); return { data: { users: options.users ?? [] }, error: null }; },
    } },
  };
  const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: options.clientMissing ? null : { id: clientId }, error: null }) };
  const mocks = {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    "@/lib/admin": { requireAdmin: async () => options.denied ? { ok: false, response: { status: 401 } } : { ok: true, user: { id: actorId, email_confirmed_at: options.unconfirmed ? null : "now" }, supabase: { from: () => chain } } },
    "@/lib/client-account": { isUuid: (s) => typeof s === "string" && /^[0-9a-f-]{36}$/.test(s) },
    "@/lib/rate-limit": { checkRateLimits: async () => !options.rateLimited },
    "@/lib/request-body": { readLimitedText: (request) => request.text() },
    "@/lib/staff-origin": { hasAllowedStaffOrigin: () => !options.badOrigin },
    "@/lib/supabase/service": { createServiceClient: () => service },
  };
  const source = await readFile(new URL("../src/app/api/admin/client-login/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: (name) => mocks[name] });
  const request = (body = {}) => new Request("https://portal.emberweb.co.za/api/admin/client-login", { method: "POST", body: JSON.stringify({ operationId: operation, clientId, username: "BioSync", password: "unique-long-password", ...body }) });
  return { post: compiledModule.exports.POST, request, calls, identity };
}

test("only a confirmed staff session from an allowed origin can start provisioning", async () => {
  for (const [options, status] of [[{ denied: true }, 401], [{ unconfirmed: true }, 403], [{ badOrigin: true }, 403], [{ clientMissing: true }, 404], [{ rateLimited: true }, 429]]) {
    const t = await route(options);
    assert.equal((await t.post(t.request())).status, status);
    assert.equal(t.calls.length, 0);
  }
});

test("creation reserves before Auth and finishes the selected client without an invitation", async () => {
  const t = await route();
  const response = await t.post(t.request());
  assert.equal(response.status, 200);
  assert.deepEqual(t.calls.map(([name]) => name), ["reserve_client_login", "createUser", "finish_client_login"]);
  assert.equal(t.calls[0][1].p_client, clientId);
  assert.equal(t.calls[0][1].p_username, "biosync");
  assert.equal(t.calls[1][1].email_confirm, true);
  assert.equal(t.calls[1][1].email, `${operation}@login.emberweb.invalid`);
  assert.equal(t.calls[2][1].p_user, userId);
});

test("completed operations do not create another user", async () => {
  const t = await route({ completed: true });
  const result = await t.post(t.request());
  assert.equal(result.status, 200);
  assert.equal(result.body.recovered, true);
  assert.deepEqual(t.calls.map(([name]) => name), ["reserve_client_login"]);
});

test("ambiguous creation only recovers the exact server-marked identity", async () => {
  const foreign = { id: userId, email: `${operation}@login.emberweb.invalid`, app_metadata: {} };
  const t = await route({ createError: true, users: [foreign] });
  assert.equal((await t.post(t.request())).status, 503);
  assert.equal(t.calls.some(([name]) => name === "finish_client_login"), false);
  const valid = { ...foreign, app_metadata: { workspace_provisioning_id: operation } };
  const recovered = await route({ createError: true, users: [valid] });
  const result = await recovered.post(recovered.request());
  assert.equal(result.status, 200);
  assert.equal(result.body.recovered, true);
  assert.equal(recovered.calls.at(-1)[0], "finish_client_login");
});

test("reservation and linking failures do not report a working account", async () => {
  const reserved = await route({ reserveError: { code: "23505" } });
  const conflict = await reserved.post(reserved.request());
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.noReservation, true);
  assert.deepEqual(reserved.calls.map(([name]) => name), ["reserve_client_login"]);
  const ambiguous = await route({ reserveError: { code: "FETCH_ERROR" } });
  const pending = await ambiguous.post(ambiguous.request());
  assert.equal(pending.status, 503);
  assert.equal(pending.body.noReservation, undefined);
  const failed = await route({ finishError: {} });
  assert.equal((await failed.post(failed.request())).status, 503);
});
