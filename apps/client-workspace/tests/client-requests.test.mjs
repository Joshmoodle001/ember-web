import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { parseRequestMutation, handleRequestWrite } from "../src/lib/client-requests.ts";
const actor = "11111111-1111-4111-8111-111111111111";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const payload = { action: "create", clientId: id, subject: "Update homepage", description: "Add new business hours", submissionId: actor };
function request(body = payload, method = "POST") { return new Request("https://emberweb.co.za/api/account/requests", { method, headers: { origin: "https://emberweb.co.za" }, body: JSON.stringify(body) }); }
function dependencies(overrides = {}) { return { staff: false, actorId: actor, allowedOrigin: () => true, readBody: (incoming) => incoming.text(), rateLimit: async () => true, mutate: async () => ({ data: id, error: null }), ...overrides }; }
test("request parser accepts create/reply/status contracts and trims text", () => {
  assert.equal(parseRequestMutation({ ...payload, subject: "  Update homepage  " }, false, "POST").subject, "Update homepage");
  assert.equal(parseRequestMutation({ action: "reply", requestId: id, body: "Client reply", submissionId: actor }, false, "POST").action, "reply");
  assert.equal(parseRequestMutation({ requestId: id, body: "Staff reply", submissionId: actor }, true, "POST").action, "reply");
  assert.equal(parseRequestMutation({ requestId: id, status: "resolved" }, true, "PATCH").action, "status");
});
test("clients cannot supply identity/role/status, unknown actions or invalid project IDs", () => {
  for (const extra of [{ actorId: actor }, { userId: actor }, { staff: true }, { status: "resolved" }, { projectId: "invalid" }]) assert.equal(parseRequestMutation({ ...payload, ...extra }, false, "POST"), null);
  assert.equal(parseRequestMutation({ requestId: id, status: "resolved" }, false, "PATCH"), null);
  assert.equal(parseRequestMutation({ ...payload, action: "admin" }, false, "POST"), null);
  assert.equal(parseRequestMutation({ ...payload, description: "x".repeat(4001) }, false, "POST"), null);
  assert.equal(parseRequestMutation({ ...payload, submissionId: "bad" }, false, "POST"), null);
  assert.equal(parseRequestMutation({ ...payload, subject: "hi\0there" }, false, "POST"), null);
});
test("write blocks cross-origin before parsing or mutating", async () => {
  let touched = false;
  const result = await handleRequestWrite(request(), dependencies({ allowedOrigin: () => false, readBody: async () => { touched = true; throw Error(); } }));
  assert.equal(result.status, 403); assert.equal(touched, false);
});
test("malformed or over-limit body never invokes mutation", async () => {
  let touched = false;
  const result = await handleRequestWrite(request(), dependencies({ readBody: async () => { throw Error("too large"); }, mutate: async () => { touched = true; return { data: id, error: null }; } }));
  assert.equal(result.status, 400); assert.equal(touched, false);
});
test("write rate limits fail closed before mutation", async () => {
  let touched = false;
  const result = await handleRequestWrite(request(), dependencies({ rateLimit: async () => false, mutate: async () => { touched = true; return { data: id, error: null }; } }));
  assert.equal(result.status, 429); assert.equal(touched, false);
  const unavailable = await handleRequestWrite(request(), dependencies({ rateLimit: async () => { throw Error(); } })); assert.equal(unavailable.status, 503);
});
test("write uses server actor and reports dashboard-only notification", async () => {
  let observed;
  const result = await handleRequestWrite(request(), dependencies({ mutate: async (...args) => { observed = args; return { data: id, error: null }; } }));
  assert.equal(result.status, 200); assert.equal(observed[0], actor); assert.equal(observed[1], false); assert.equal(observed[2], "create"); assert.equal(observed[3].submissionId, actor);
  assert.equal(result.body.notification, "dashboard_only");
});
test("isolation denial, conflicting idempotency and missing schema return safe errors", async () => {
  for (const [code, status] of [["42501", 404], ["22023", 400], ["PGRST202", 503]]) {
    const result = await handleRequestWrite(request(), dependencies({ mutate: async () => ({ data: null, error: { code, message: "sensitive database detail" } }) }));
    assert.equal(result.status, status); assert.doesNotMatch(JSON.stringify(result.body), /sensitive/);
  }
});
async function loadClientRoute(user) {
  const calls = [];
  const mocks = {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: new Headers(init.headers) }) } },
    "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) },
    "@/lib/supabase/service": { createServiceClient: () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { data: { requests: [], clients: [] }, error: null }; } }) },
    "@/lib/client-requests": { handleRequestWrite }, "@/lib/staff-origin": { hasAllowedStaffOrigin: () => true },
    "@/lib/request-body": { readLimitedText: (incoming) => incoming.text() }, "@/lib/rate-limit": { checkRateLimits: async () => true, getTrustedClientIp: () => null },
  };
  const source = await readFile(new URL("../src/app/api/account/requests/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: (name) => mocks[name] });
  return { routes: compiledModule.exports, calls };
}
test("client list rejects anonymous/unconfirmed identities without service access", async () => {
  for (const user of [null, { id: actor, email_confirmed_at: null }]) { const { routes, calls } = await loadClientRoute(user); assert.equal((await routes.GET()).status, 401); assert.equal(calls.length, 0); }
});
test("client list uses verified actor and false staff mode with no-store", async () => {
  const { routes, calls } = await loadClientRoute({ id: actor, email_confirmed_at: "2026-10-23" });
  const response = await routes.GET(); assert.equal(response.status, 200); assert.equal(calls[0].name, "list_client_requests");
  assert.equal(calls[0].args.p_actor_id, actor); assert.equal(calls[0].args.p_staff, false); assert.equal(response.headers.get("cache-control"), "private, no-store");
});
