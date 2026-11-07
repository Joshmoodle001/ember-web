import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readLimitedText, RequestBodyTooLargeError } from "../src/lib/request-body.ts";
import { hasCronAuthorization } from "../src/lib/cron-auth.ts";
import { researchJobSelect } from "../src/lib/website-research.ts";

const require = createRequire(import.meta.url);
const ownerOrigin = "https://portal.emberweb.co.za";
const queueRoutePath = new URL("../src/app/api/admin/outreach/research/route.ts", import.meta.url);
const processRoutePath = new URL("../src/app/api/admin/outreach/research/process/route.ts", import.meta.url);
const cronRoutePath = new URL("../src/app/api/cron/website-research/route.ts", import.meta.url);
const workerPath = new URL("../src/lib/website-research-worker.ts", import.meta.url);
const prospectId = "893b1f16-8b31-43e6-9a75-1d28bf380201";
const jobId = "a3efca49-d331-4b3f-a599-a04513a3d888";
const leaseToken = "52a6c486-eeb2-45a1-98b2-2365854cb869";
const sourceUrl = "https://studio.example/";
const sourceUpdatedAt = "2026-10-17T08:00:00.000Z";
const cronSecret = "c".repeat(40);
const plain = (value) => JSON.parse(JSON.stringify(value));

async function compileModule(path, mocks, globals = {}) {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(path, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const compiledModule = { exports: {} };
  const sandboxRequire = (id) => mocks[id] ?? require(id);
  vm.runInNewContext(compiled, {
    exports: compiledModule.exports,
    module: compiledModule,
    require: sandboxRequire,
    console: { error() {}, warn() {}, log() {} },
    Date,
    URL,
    Headers,
    ...globals,
  });
  return compiledModule.exports;
}

function nextResponseMock() {
  return { json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: new Headers(init.headers) }) };
}

function prospect(overrides = {}) {
  return {
    id: prospectId,
    business_name: "Studio North",
    website: "studio.example",
    updated_at: sourceUpdatedAt,
    permission_status: "opted_in",
    ...overrides,
  };
}

function job(overrides = {}) {
  return {
    id: jobId,
    prospect_id: prospectId,
    business_name: "Studio North",
    source_url: sourceUrl,
    source_updated_at: sourceUpdatedAt,
    status: "queued",
    attempts: 0,
    result: null,
    error_code: null,
    created_at: sourceUpdatedAt,
    updated_at: sourceUpdatedAt,
    finished_at: null,
    ...overrides,
  };
}

function createApiState(overrides = {}) {
  const state = {
    authenticated: true,
    originAllowed: true,
    prospectRow: { data: prospect(), error: null },
    prospectError: null,
    historyRows: [],
    historyError: null,
    rateLimitResult: true,
    rateLimitError: null,
    insertError: null,
    insertedJob: job(),
    normalizedUrl: sourceUrl,
    normalizeError: null,
    authCalls: 0,
    originCalls: 0,
    bodyReads: 0,
    userQueries: [],
    serviceCalls: 0,
    serviceQueries: [],
    rateLimitCalls: [],
    normalizeCalls: [],
    ...overrides,
  };

  state.userClient = {
    from(table) {
      const query = { client: "authenticated-user", table, columns: null, filters: [], orders: [], limit: null };
      state.userQueries.push(query);
      const chain = {
        select(columns) { query.columns = columns; return chain; },
        eq(column, value) { query.filters.push([column, value]); return chain; },
        order(column, options) { query.orders.push([column, options]); return chain; },
        limit(value) { query.limit = value; return chain; },
        async maybeSingle() {
          query.terminal = "maybeSingle";
          if (table === "outreach_prospects") return state.prospectError ? { data: null, error: state.prospectError } : state.prospectRow;
          return { data: null, error: null };
        },
        then(resolve, reject) {
          query.terminal = "then";
          const data = table === "website_research_jobs" ? state.historyRows : [];
          const error = table === "website_research_jobs" ? state.historyError : null;
          return Promise.resolve({ data, error }).then(resolve, reject);
        },
      };
      return chain;
    },
  };

  state.serviceClient = {
    from(table) {
      const query = { client: "service-role", table, payload: null, columns: null };
      state.serviceQueries.push(query);
      return {
        insert(payload) {
          query.payload = payload;
          return {
            select(columns) {
              query.columns = columns;
              return { single: async () => ({ data: state.insertError ? null : state.insertedJob, error: state.insertError }) };
            },
          };
        },
      };
    },
  };

  state.auth = state.authenticated
    ? { ok: true, user: { id: "synthetic-admin" }, supabase: state.userClient }
    : { ok: false, response: { status: 401, body: { error: "Unauthorized" }, headers: new Headers() } };
  return state;
}

async function loadQueueRoute(state, method = "POST") {
  const loaded = await compileModule(queueRoutePath, {
    "next/server": { NextResponse: nextResponseMock() },
    "@/lib/admin": { requireAdmin: async () => { state.authCalls += 1; return state.auth; } },
    "@/lib/staff-origin": { hasAllowedStaffOrigin: (request) => { state.originCalls += 1; return state.originAllowed && request.headers.get("origin") === ownerOrigin; } },
    "@/lib/supabase/service": { createServiceClient: () => { state.serviceCalls += 1; return state.serviceClient; } },
    "@/lib/rate-limit": { checkRateLimits: async (client, limits) => { state.rateLimitCalls.push({ client, limits }); if (state.rateLimitError) throw state.rateLimitError; return state.rateLimitResult; } },
    "@/lib/request-body": { readLimitedText: (...args) => { state.bodyReads += 1; return readLimitedText(...args); }, RequestBodyTooLargeError },
    "@/lib/website-audit": {
      normalizeResearchUrl: (raw) => { state.normalizeCalls.push(raw); if (state.normalizeError) throw state.normalizeError; return state.normalizedUrl; },
    },
    "@/lib/website-research": { researchJobSelect },
  });
  return loaded[method];
}

function queueRequest(body, { origin = ownerOrigin } = {}) {
  return new Request(`${ownerOrigin}/api/admin/outreach/research`, {
    method: "POST",
    headers: { ...(origin === null ? {} : { origin }), ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function oversizedQueueRequest() {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(JSON.stringify({ prospectId, padding: "x".repeat(1100) }))); controller.close(); } });
  return new Request(`${ownerOrigin}/api/admin/outreach/research`, {
    method: "POST",
    headers: { origin: ownerOrigin, "content-type": "application/json" },
    body: stream,
    duplex: "half",
  });
}

test("research queue returns before reading the body or touching providers/service storage when auth fails", async () => {
  const state = createApiState({ authenticated: false });
  const POST = await loadQueueRoute(state);
  const response = await POST(queueRequest({ prospectId }));
  assert.equal(response.status, 401);
  assert.equal(state.bodyReads, 0);
  assert.equal(state.userQueries.length, 0);
  assert.equal(state.serviceCalls, 0);
  assert.equal(state.rateLimitCalls.length, 0);
  assert.equal(state.serviceQueries.length, 0);
  assert.equal(state.normalizeCalls.length, 0);
});

test("research queue rejects foreign origins before reading input or creating a service client", async () => {
  const state = createApiState({ originAllowed: false });
  const POST = await loadQueueRoute(state);
  const response = await POST(queueRequest({ prospectId }, { origin: "https://attacker.example" }));
  assert.equal(response.status, 403);
  assert.equal(state.bodyReads, 0);
  assert.equal(state.userQueries.length, 0);
  assert.equal(state.serviceCalls, 0);
  assert.equal(state.rateLimitCalls.length, 0);
});

test("research queue requires exactly one UUID field and enforces the 1 KiB body cap before storage access", async () => {
  for (const body of [{}, { prospectId: "not-a-uuid" }, { prospectId, other: "not allowed" }]) {
    const state = createApiState();
    const POST = await loadQueueRoute(state);
    assert.equal((await POST(queueRequest(body))).status, 400);
    assert.equal(state.userQueries.length, 0);
    assert.equal(state.serviceCalls, 0);
  }

  const state = createApiState();
  const POST = await loadQueueRoute(state);
  const response = await POST(oversizedQueueRequest());
  assert.equal(response.status, 413);
  assert.equal(state.userQueries.length, 0);
  assert.equal(state.serviceCalls, 0);
});

test("research queue loads only the saved prospect through the authenticated RLS client", async () => {
  const state = createApiState();
  const POST = await loadQueueRoute(state);
  const response = await POST(queueRequest({ prospectId: prospectId.toUpperCase() }));

  assert.equal(response.status, 201);
  assert.deepEqual(state.userQueries.map(({ table, columns, filters }) => ({ table, columns, filters: plain(filters) })), [
    { table: "outreach_prospects", columns: "id,business_name,website,updated_at,permission_status", filters: [["id", prospectId]] },
  ]);
  assert.deepEqual(state.serviceQueries.map(({ table }) => table), ["website_research_jobs"]);
  assert.equal(state.serviceCalls, 1);
  assert.equal(state.rateLimitCalls.length, 1);
  assert.deepEqual(plain(state.rateLimitCalls[0].limits), [
    { scope: "website-research:admin", identity: "synthetic-admin", limit: 10, windowSeconds: 3600 },
    { scope: "website-research:host", identity: "studio.example", limit: 1, windowSeconds: 3600 },
  ]);
  assert.equal(state.serviceQueries[0].payload.prospect_id, prospectId);
  assert.equal(state.serviceQueries[0].payload.source_url, sourceUrl);
  assert.equal(state.serviceQueries[0].payload.source_updated_at, sourceUpdatedAt);
  assert.equal("lease_token" in state.serviceQueries[0].payload, false);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("do-not-contact and unsafe website records are rejected before queueing", async () => {
  const suppressed = createApiState({ prospectRow: { data: prospect({ permission_status: "do_not_contact" }), error: null } });
  const suppressedPost = await loadQueueRoute(suppressed);
  const suppressedResponse = await suppressedPost(queueRequest({ prospectId }));
  assert.equal(suppressedResponse.status, 409);
  assert.equal(suppressed.normalizeCalls.length, 0);
  assert.equal(suppressed.serviceCalls, 0);
  assert.equal(suppressed.serviceQueries.length, 0);

  const unsafe = createApiState({ normalizeError: new Error("synthetic unsafe target") });
  const unsafePost = await loadQueueRoute(unsafe);
  const unsafeResponse = await unsafePost(queueRequest({ prospectId }));
  assert.equal(unsafeResponse.status, 400);
  assert.deepEqual(unsafe.normalizeCalls, ["studio.example"]);
  assert.equal(unsafe.serviceCalls, 0);
  assert.equal(unsafe.serviceQueries.length, 0);
});

test("queue rate-limit denials and failures fail closed, while duplicate active jobs become conflicts", async () => {
  const denied = createApiState({ rateLimitResult: false });
  const deniedPost = await loadQueueRoute(denied);
  assert.equal((await deniedPost(queueRequest({ prospectId }))).status, 429);
  assert.equal(denied.serviceQueries.length, 0);

  const unavailable = createApiState({ rateLimitError: new Error("synthetic limiter failure") });
  const unavailablePost = await loadQueueRoute(unavailable);
  assert.equal((await unavailablePost(queueRequest({ prospectId }))).status, 503);
  assert.equal(unavailable.serviceQueries.length, 0);

  const duplicate = createApiState({ insertError: { code: "23505" } });
  const duplicatePost = await loadQueueRoute(duplicate);
  assert.equal((await duplicatePost(queueRequest({ prospectId }))).status, 409);
  assert.deepEqual(duplicate.serviceQueries.map(({ table }) => table), ["website_research_jobs"]);
});

test("research history is limited to 50 rows and never selects or returns a lease token", async () => {
  const row = job({ status: "completed", attempts: 1, result: { title: "A public title" }, finished_at: sourceUpdatedAt });
  const state = createApiState({ historyRows: [row] });
  const GET = await loadQueueRoute(state, "GET");
  const response = await GET();

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.jobs, [row]);
  const historyQuery = state.userQueries[0];
  assert.equal(historyQuery.table, "website_research_jobs");
  assert.equal(historyQuery.limit, 50);
  assert.deepEqual(plain(historyQuery.orders), [["created_at", { ascending: false }]]);
  assert.equal(historyQuery.columns, researchJobSelect);
  assert.equal(researchJobSelect.split(",").includes("lease_token"), false);
  assert.equal(JSON.stringify(response.body).includes("lease_token"), false);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

function createWorkerState(overrides = {}) {
  const state = {
    claimResult: { data: [{ ...job(), lease_token: leaseToken }], error: null },
    prospectResult: { data: prospect(), error: null },
    finishResult: { data: { id: jobId }, error: null },
    normalizeResult: sourceUrl,
    normalizeError: null,
    auditResult: { sourceUrl, checkedAt: sourceUpdatedAt, title: "Studio North", description: "A local studio", heading: "Welcome", hasViewport: true, hasContactLink: true, hasBookingLink: false, observations: [] },
    auditError: null,
    rpcCalls: [],
    queries: [],
    auditCalls: [],
    normalizeCalls: [],
    ...overrides,
  };
  state.service = {
    async rpc(name, args) { state.rpcCalls.push({ name, args }); return state.claimResult; },
    from(table) {
      const query = { table, columns: null, filters: [], updateValues: null };
      state.queries.push(query);
      const chain = {
        select(columns) { query.columns = columns; return chain; },
        update(values) { query.updateValues = values; return chain; },
        eq(column, value) { query.filters.push([column, value]); return chain; },
        async maybeSingle() {
          query.terminal = "maybeSingle";
          if (table === "outreach_prospects") return state.prospectResult;
          return state.finishResult;
        },
      };
      return chain;
    },
  };
  return state;
}

async function loadWorker(state) {
  const loaded = await compileModule(workerPath, {
    "server-only": {},
    "@/lib/supabase/service": { createServiceClient: () => state.service },
    "@/lib/website-audit": {
      auditWebsite: async (url) => { state.auditCalls.push(url); if (state.auditError) throw state.auditError; return state.auditResult; },
      normalizeResearchUrl: (url) => { state.normalizeCalls.push(url); if (state.normalizeError) throw state.normalizeError; return state.normalizeResult; },
      WebsiteAuditError: class WebsiteAuditError extends Error { constructor(code) { super("synthetic audit error"); this.code = code; } },
    },
  });
  return loaded.processWebsiteResearch;
}

test("worker claim-none result exits without prospect reads or website requests", async () => {
  const state = createWorkerState({ claimResult: { data: [], error: null } });
  const process = await loadWorker(state);
  assert.deepEqual(plain(await process()), { processed: 0, messagesSent: 0 });
  assert.deepEqual(state.rpcCalls, [{ name: "claim_website_research", args: undefined }]);
  assert.equal(state.queries.length, 0);
  assert.equal(state.auditCalls.length, 0);
});

test("worker skips missing, do-not-contact, and changed source snapshots without crawling", async () => {
  const cases = [
    { name: "missing prospect", prospectResult: { data: null, error: null }, status: "skipped", code: "prospect_unavailable", normalizations: 0 },
    { name: "do not contact", prospectResult: { data: prospect({ permission_status: "do_not_contact" }), error: null }, status: "skipped", code: "do_not_contact", normalizations: 0 },
    { name: "changed record timestamp", prospectResult: { data: prospect({ updated_at: "2026-10-18T08:00:00.000Z" }), error: null }, status: "skipped", code: "prospect_changed", normalizations: 0 },
    { name: "changed normalized URL", prospectResult: { data: prospect(), error: null }, normalizeResult: "https://new-studio.example/", status: "skipped", code: "prospect_changed", normalizations: 1 },
  ];

  for (const item of cases) {
    const state = createWorkerState({ prospectResult: item.prospectResult, ...(item.normalizeResult ? { normalizeResult: item.normalizeResult } : {}) });
    const process = await loadWorker(state);
    assert.deepEqual(plain(await process()), { processed: 1, status: item.status, messagesSent: 0 }, item.name);
    assert.equal(state.auditCalls.length, 0, item.name);
    assert.equal(state.normalizeCalls.length, item.normalizations, item.name);
    const finish = state.queries.find((query) => query.table === "website_research_jobs");
    assert.equal(finish.updateValues.status, item.status, item.name);
    assert.equal(finish.updateValues.error_code, item.code, item.name);
    assert.equal(finish.updateValues.result, null, item.name);
    assert.deepEqual(plain(finish.filters), [["id", jobId], ["lease_token", leaseToken], ["status", "running"]], item.name);
  }
});

test("worker stores successful audit evidence only under the matching lease and running status", async () => {
  const state = createWorkerState();
  const process = await loadWorker(state);
  assert.deepEqual(plain(await process()), { processed: 1, status: "completed", messagesSent: 0 });
  assert.deepEqual(state.auditCalls, [sourceUrl]);

  const finish = state.queries.find((query) => query.table === "website_research_jobs");
  assert.equal(finish.updateValues.status, "completed");
  assert.deepEqual(plain(finish.updateValues.result), state.auditResult);
  assert.equal(finish.updateValues.error_code, null);
  assert.equal(finish.updateValues.lease_token, null);
  assert.deepEqual(plain(finish.filters), [["id", jobId], ["lease_token", leaseToken], ["status", "running"]]);
});

test("worker reports zero when lease-guarded completion is stale and propagates claim storage errors", async () => {
  const stale = createWorkerState({ finishResult: { data: null, error: null } });
  const staleProcess = await loadWorker(stale);
  assert.deepEqual(plain(await staleProcess()), { processed: 0, messagesSent: 0 });

  const brokenClaim = createWorkerState({ claimResult: { data: null, error: { code: "synthetic-claim-failure" } } });
  const brokenProcess = await loadWorker(brokenClaim);
  await assert.rejects(brokenProcess(), /storage is unavailable/);
  assert.equal(brokenClaim.queries.length, 0);
  assert.equal(brokenClaim.auditCalls.length, 0);
});

async function loadCronRoute(processWebsiteResearch) {
  const loaded = await compileModule(cronRoutePath, {
    "next/server": { NextResponse: nextResponseMock() },
    "@/lib/cron-auth": { hasCronAuthorization },
    "@/lib/website-research-worker": { processWebsiteResearch },
  }, { process: { env: { CRON_SECRET: cronSecret } } });
  return loaded.GET;
}

test("cron rejects unauthorized requests before claiming a job and maps claim failures to a private 503", async () => {
  let processCalls = 0;
  const GET = await loadCronRoute(async () => { processCalls += 1; return { processed: 0, messagesSent: 0 }; });
  const unauthorized = await GET(new Request("https://portal.example.test/api/cron/website-research"));
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("cache-control"), "private, no-store");
  assert.equal(processCalls, 0);

  const failedState = createWorkerState({ claimResult: { data: null, error: { code: "synthetic-claim-failure" } } });
  const failedWorker = await loadWorker(failedState);
  const failedCron = await loadCronRoute(failedWorker);
  const authorized = await failedCron(new Request("https://portal.example.test/api/cron/website-research", { headers: { authorization: `Bearer ${cronSecret}` } }));
  assert.equal(authorized.status, 503);
  assert.equal(authorized.headers.get("cache-control"), "private, no-store");
  assert.equal(failedState.rpcCalls.length, 1);
  assert.equal(failedState.auditCalls.length, 0);
});

function createProcessRouteState(overrides = {}) {
  return {
    authenticated: true,
    originAllowed: true,
    rateLimitResult: true,
    rateLimitError: null,
    serviceCalls: 0,
    authCalls: 0,
    originCalls: 0,
    rateLimitCalls: 0,
    processCalls: 0,
    processError: null,
    ...overrides,
  };
}

async function loadProcessRoute(state) {
  const loaded = await compileModule(processRoutePath, {
    "next/server": { NextResponse: nextResponseMock() },
    "@/lib/admin": { requireAdmin: async () => { state.authCalls += 1; return state.authenticated ? { ok: true, user: { id: "synthetic-admin" } } : { ok: false, response: { status: 401 } }; } },
    "@/lib/staff-origin": { hasAllowedStaffOrigin: () => { state.originCalls += 1; return state.originAllowed; } },
    "@/lib/supabase/service": { createServiceClient: () => { state.serviceCalls += 1; return { synthetic: true }; } },
    "@/lib/rate-limit": { checkRateLimits: async () => { state.rateLimitCalls += 1; if (state.rateLimitError) throw state.rateLimitError; return state.rateLimitResult; } },
    "@/lib/website-research-worker": { processWebsiteResearch: async () => { state.processCalls += 1; if (state.processError) throw state.processError; return { processed: 1, messagesSent: 0 }; } },
  });
  return loaded.POST;
}

test("manual processing gates on admin auth, same-site origin, and rate limits before worker execution", async () => {
  const request = () => new Request(`${ownerOrigin}/api/admin/outreach/research/process`, { method: "POST", headers: { origin: ownerOrigin } });

  const unauthenticated = createProcessRouteState({ authenticated: false });
  assert.equal((await (await loadProcessRoute(unauthenticated))(request())).status, 401);
  assert.equal(unauthenticated.originCalls, 0);
  assert.equal(unauthenticated.serviceCalls, 0);
  assert.equal(unauthenticated.processCalls, 0);

  const foreign = createProcessRouteState({ originAllowed: false });
  assert.equal((await (await loadProcessRoute(foreign))(request())).status, 403);
  assert.equal(foreign.serviceCalls, 0);
  assert.equal(foreign.rateLimitCalls, 0);
  assert.equal(foreign.processCalls, 0);

  const limited = createProcessRouteState({ rateLimitResult: false });
  assert.equal((await (await loadProcessRoute(limited))(request())).status, 429);
  assert.equal(limited.serviceCalls, 1);
  assert.equal(limited.processCalls, 0);

  const limiterFailure = createProcessRouteState({ rateLimitError: new Error("synthetic limiter failure") });
  const unavailable = await (await loadProcessRoute(limiterFailure))(request());
  assert.equal(unavailable.status, 503);
  assert.equal(limiterFailure.processCalls, 0);

  const workerFailure = createProcessRouteState({ processError: new Error("synthetic claim failure") });
  const failed = await (await loadProcessRoute(workerFailure))(request());
  assert.equal(failed.status, 503);
  assert.equal(workerFailure.processCalls, 1);
  assert.equal(failed.headers.get("cache-control"), "private, no-store");

  const allowed = createProcessRouteState();
  const processed = await (await loadProcessRoute(allowed))(request());
  assert.equal(processed.status, 200);
  assert.deepEqual(processed.body, { processed: 1, messagesSent: 0 });
  assert.equal(allowed.processCalls, 1);
});
