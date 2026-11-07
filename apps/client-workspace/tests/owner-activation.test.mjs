import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readLimitedText } from "../src/lib/request-body.ts";

const require = createRequire(import.meta.url);
const routePath = new URL("../src/app/api/auth/activate/route.ts", import.meta.url);
const migrationPath = new URL("../supabase/migrations/20261016144407_outreach_preparation_and_owner_activation.sql", import.meta.url);
const allowedOrigin = "https://portal.emberweb.co.za";
const activationCode = "a".repeat(64);
const activationPassword = "A synthetic secure password!";
const asPlainData = (value) => JSON.parse(JSON.stringify(value));

async function loadActivationRoute(state) {
  const source = await readFile(routePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const compiledModule = { exports: {} };
  const mocks = {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: new Headers(init.headers) }) } },
    "@/lib/supabase/service": { createServiceClient: () => { state.serviceClientCalls += 1; return state.service; } },
    "@/lib/supabase/env": { getAdminEmails: () => state.adminEmails },
    "@/lib/request-body": { readLimitedText },
    "@/lib/rate-limit": {
      checkRateLimits: async (_service, checks) => { state.rateLimitCalls.push(asPlainData(checks)); if (state.rateLimitError) throw new Error("synthetic rate-limit failure"); return state.rateLimitAllowed; },
      getTrustedClientIp: () => { state.trustedIpCalls += 1; return state.trustedIp; },
    },
  };
  const sandboxRequire = (id) => mocks[id] ?? require(id);
  vm.runInNewContext(compiled, {
    exports: compiledModule.exports,
    module: compiledModule,
    require: sandboxRequire,
    process: { env: state.env },
    console,
    URL,
    Headers,
    Date,
  });
  return compiledModule.exports.POST;
}

function createState(overrides = {}) {
  const state = {
    env: { NODE_ENV: "production", VERCEL: "1" },
    adminEmails: ["owner@example.co.za"],
    serviceClientCalls: 0,
    rateLimitCalls: [],
    rateLimitAllowed: true,
    rateLimitError: false,
    trustedIpCalls: 0,
    trustedIp: "203.0.113.8",
    claim: { codeHash: createHash("sha256").update(activationCode).digest("hex"), userId: "owner-user-id", expiresAt: Date.now() + 60_000, claimedAt: null },
    user: { id: "owner-user-id", email: "owner@example.co.za", email_confirmed_at: "2026-10-01T00:00:00Z" },
    rpcCalls: [],
    getUserCalls: [],
    updateCalls: [],
    authUpdateError: null,
  };
  Object.assign(state, overrides);
  state.service = {
    async rpc(name, args) {
      state.rpcCalls.push({ name, args: asPlainData(args) });
      const now = Date.now();
      if (name !== "claim_owner_activation" || args.p_code_hash !== state.claim.codeHash || state.claim.expiresAt <= now || state.claim.claimedAt !== null) return { data: null, error: null };
      state.claim.claimedAt = now;
      return { data: state.claim.userId, error: null };
    },
    auth: { admin: {
      async getUserById(userId) { state.getUserCalls.push(userId); return { data: { user: { ...state.user, id: userId } }, error: state.userError ?? null }; },
      async updateUserById(userId, update) { state.updateCalls.push({ userId, update: asPlainData(update) }); return { error: state.authUpdateError }; },
    } },
  };
  return state;
}

function activationRequest(body = { code: activationCode, password: activationPassword }, { origin = allowedOrigin, ip = "203.0.113.8" } = {}) {
  return new Request(`${allowedOrigin}/api/auth/activate`, {
    method: "POST",
    headers: {
      ...(origin === null ? {} : { origin }),
      ...(ip === null ? {} : { "x-vercel-forwarded-for": ip }),
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("owner activation rejects invalid origins, malformed bodies, and invalid credentials before creating Supabase service access", async () => {
  const invalidOrigin = createState();
  const invalidOriginRoute = await loadActivationRoute(invalidOrigin);
  const forbidden = await invalidOriginRoute(activationRequest(undefined, { origin: "https://attacker.example" }));
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get("cache-control"), "private, no-store");
  assert.equal(invalidOrigin.serviceClientCalls, 0);

  for (const body of ["not-json", {}, { code: "bad", password: activationPassword }, { code: activationCode, password: "short" }, { code: activationCode, password: "p".repeat(129) }]) {
    const state = createState();
    const route = await loadActivationRoute(state);
    const request = typeof body === "string"
      ? new Request(`${allowedOrigin}/api/auth/activate`, { method: "POST", headers: { origin: allowedOrigin, "content-type": "application/json", "x-vercel-forwarded-for": "203.0.113.8" }, body })
      : activationRequest(body);
    assert.equal((await route(request)).status, 400);
    assert.equal(state.serviceClientCalls, 0);
    assert.equal(state.rpcCalls.length, 0);
  }
});

test("owner activation rejects oversized request bodies before Supabase access", async () => {
  const state = createState();
  const route = await loadActivationRoute(state);
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(2_001)); controller.close(); } });
  const request = new Request(`${allowedOrigin}/api/auth/activate`, {
    method: "POST",
    headers: { origin: allowedOrigin, "x-vercel-forwarded-for": "203.0.113.8", "content-type": "application/json" },
    body,
    duplex: "half",
  });

  assert.equal((await route(request)).status, 400);
  assert.equal(state.serviceClientCalls, 0);
  assert.equal(state.rpcCalls.length, 0);
});

test("production activation requires a valid Vercel client IP and applies per-code and per-IP limits before claiming", async () => {
  const missingIp = createState();
  const missingIpRoute = await loadActivationRoute(missingIp);
  assert.equal((await missingIpRoute(activationRequest(undefined, { ip: null }))).status, 503);
  assert.equal(missingIp.rateLimitCalls.length, 0);
  assert.equal(missingIp.rpcCalls.length, 0);

  const limited = createState({ rateLimitAllowed: false });
  const limitedRoute = await loadActivationRoute(limited);
  assert.equal((await limitedRoute(activationRequest())).status, 429);
  assert.equal(limited.rpcCalls.length, 0);
  assert.equal(limited.updateCalls.length, 0);
  assert.deepEqual(limited.rateLimitCalls[0].map((item) => item.scope), ["owner-activation:code", "owner-activation:ip"]);
  assert.equal(limited.rateLimitCalls[0][0].identity, createHash("sha256").update(activationCode).digest("hex"));
  assert.equal(limited.rateLimitCalls[0][1].identity, "203.0.113.8");
});

test("expired, mismatched, or already-claimed activation tokens never update a password", async () => {
  const expired = createState({ claim: { ...createState().claim, expiresAt: Date.now() - 1 } });
  const expiredRoute = await loadActivationRoute(expired);
  assert.equal((await expiredRoute(activationRequest())).status, 400);
  assert.equal(expired.getUserCalls.length, 0);
  assert.equal(expired.updateCalls.length, 0);

  const mismatched = createState({ claim: { ...createState().claim, codeHash: "b".repeat(64) } });
  const mismatchedRoute = await loadActivationRoute(mismatched);
  assert.equal((await mismatchedRoute(activationRequest())).status, 400);
  assert.equal(mismatched.updateCalls.length, 0);

  const alreadyClaimed = createState({ claim: { ...createState().claim, claimedAt: Date.now() - 1 } });
  const alreadyClaimedRoute = await loadActivationRoute(alreadyClaimed);
  assert.equal((await alreadyClaimedRoute(activationRequest())).status, 400);
  assert.equal(alreadyClaimed.updateCalls.length, 0);
});

test("unconfirmed or non-admin users cannot receive password updates", async () => {
  const unconfirmed = createState({ user: { id: "owner-user-id", email: "owner@example.co.za", email_confirmed_at: null } });
  const unconfirmedRoute = await loadActivationRoute(unconfirmed);
  const response = await unconfirmedRoute(activationRequest());
  assert.equal(response.status, 403);
  assert.match(response.body.error, /email must be confirmed/i);
  assert.equal(unconfirmed.rpcCalls.length, 1);
  assert.equal(unconfirmed.updateCalls.length, 0);

  const notAdmin = createState({ user: { id: "other-user-id", email: "someone-else@example.co.za", email_confirmed_at: "2026-10-01T00:00:00Z" } });
  const notAdminRoute = await loadActivationRoute(notAdmin);
  assert.equal((await notAdminRoute(activationRequest())).status, 403);
  assert.equal(notAdmin.getUserCalls.length, 1);
  assert.equal(notAdmin.updateCalls.length, 0);
});

test("owner activation consumes one claim once and updates only the existing confirmed owner password", async () => {
  const state = createState();
  const route = await loadActivationRoute(state);
  const first = await route(activationRequest());
  const retry = await route(activationRequest());

  assert.equal(first.status, 200);
  assert.deepEqual(asPlainData(first.body), { success: true });
  assert.equal(retry.status, 400);
  assert.match(retry.body.error, /invalid, expired or already used/i);
  assert.equal(state.rpcCalls.length, 2);
  assert.equal(state.rpcCalls.every((call) => call.name === "claim_owner_activation"), true);
  assert.equal(state.getUserCalls.length, 1);
  assert.deepEqual(state.updateCalls, [{ userId: "owner-user-id", update: { password: activationPassword } }]);
  assert.equal(state.claim.claimedAt !== null, true);
});

test("owner activation migration restricts the private token and exposes only one service-role claim operation", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const claimFunction = migration.match(/create function public\.claim_owner_activation[\s\S]*?\$\$;/i)?.[0];

  assert.match(migration, /create table workspace_private\.owner_activation/i);
  assert.match(migration, /alter table workspace_private\.owner_activation enable row level security/i);
  assert.match(migration, /revoke all on workspace_private\.owner_activation from public, anon, authenticated, service_role/i);
  assert.match(migration, /grant select, update on workspace_private\.owner_activation to service_role/i);
  assert.ok(claimFunction);
  assert.match(claimFunction, /language sql security invoker set search_path = ''/i);
  assert.match(claimFunction, /code_hash = p_code_hash[\s\S]*?expires_at > now\(\)[\s\S]*?claimed_at is null[\s\S]*?returning user_id/i);
  assert.match(migration, /revoke all on function public\.claim_owner_activation\(text\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.claim_owner_activation\(text\) to service_role/i);
});
