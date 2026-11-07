import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { normalizePublicResearchPage, normalizeResearchUrl, WebsiteAuditError } from "../src/lib/website-audit.ts";
import { readLimitedText, RequestBodyTooLargeError } from "../src/lib/request-body.ts";

const require = createRequire(import.meta.url);
const paths = {
  campaign: new URL("../src/app/api/admin/outreach/bot/route.ts", import.meta.url),
  process: new URL("../src/app/api/admin/outreach/bot/process/route.ts", import.meta.url),
  import: new URL("../src/app/api/admin/outreach/bot/import/route.ts", import.meta.url),
  cron: new URL("../src/app/api/cron/outreach-bot/route.ts", import.meta.url),
  worker: new URL("../src/lib/outreach-bot-worker.ts", import.meta.url),
};
const campaignId = "b1000000-0000-4000-8000-000000000001";
const jobId = "b2000000-0000-4000-8000-000000000002";
const ownerId = "b3000000-0000-4000-8000-000000000003";
const origin = "https://emberweb.co.za";
const plain = (value) => JSON.parse(JSON.stringify(value));

async function compile(path, mocks = {}, globals = {}) {
  const source = await readFile(path, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(compiled, { exports: loaded.exports, module: loaded, require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), console, URL, Date, Buffer, process: { env: { CRON_SECRET: "synthetic-cron-secret" } }, ...globals });
  return loaded.exports;
}
const validation = await compile(new URL("../src/lib/outreach-bot-validation.ts", import.meta.url), {
  "./website-audit": { normalizePublicResearchPage, normalizeResearchUrl },
});
const shared = await compile(new URL("../src/lib/outreach-bot.ts", import.meta.url));
function campaign(overrides = {}) {
  return { name: "Local service research", productKey: "emberweb", industry: "services", city: "Durban", dailyLimit: 3, maxSites: 5, sources: [{ kind: "business", url: "https://sample-business.co.za/about" }], ...overrides };
}
function request(body = {}, extra = {}) {
  return new Request(`${origin}/api/admin/outreach/bot`, { method: extra.method ?? "POST", headers: { ...(extra.origin === null ? {} : { origin: extra.origin ?? origin }), "Content-Type": "application/json" }, body: extra.raw ?? JSON.stringify(body) });
}
function routeState(overrides = {}) {
  const state = { authenticated: true, originAllowed: true, rateAllowed: true, rateError: false, queries: [], rpcCalls: [], serviceCalls: 0, originCalls: [], workerCalls: 0, rpcError: null, rpcData: undefined, ...overrides };
  state.database = { from(table) {
    const query = { table, filters: [] };
    state.queries.push(query);
    const chain = {
      select(columns) { query.columns = columns; return chain; },
      eq(key, value) { query.filters.push([key, value]); return chain; },
      order(key, options) { query.order = [key, options]; return chain; },
      limit(value) { query.limit = value; return chain; },
      async maybeSingle() { return { data: { id: campaignId, name: "Saved campaign" }, error: null }; },
      then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
    };
    return chain;
  } };
  state.service = { async rpc(name, args) {
    state.rpcCalls.push([name, args]);
    const data = state.rpcData === undefined ? name === "create_outreach_bot_campaign" ? campaignId : name === "import_outreach_bot_result" ? [{ prospect_id: ownerId, imported: false }] : true : state.rpcData;
    return { data, error: state.rpcError };
  } };
  return state;
}
async function route(kind, state) {
  return compile(paths[kind], {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: new Headers(init.headers) }) } },
    "@/lib/admin": { requireAdmin: async () => state.authenticated ? { ok: true, user: { id: ownerId }, supabase: state.database } : { ok: false, response: { status: 401 } } },
    "@/lib/staff-origin": { hasAllowedStaffOrigin: (_request, required) => { state.originCalls.push(required); return state.originAllowed; } },
    "@/lib/request-body": { readLimitedText, RequestBodyTooLargeError },
    "@/lib/supabase/service": { createServiceClient: () => { state.serviceCalls += 1; return state.service; } },
    "@/lib/rate-limit": { checkRateLimits: async () => { if (state.rateError) throw new Error("synthetic limiter outage"); return state.rateAllowed; } },
    "@/lib/outreach-bot": shared,
    "@/lib/outreach-bot-validation": validation,
    "@/lib/outreach-bot-worker": { processOutreachBot: async () => { state.workerCalls += 1; return { processed: 0, completed: 0, failed: 0, skipped: 0, messagesSent: 0 }; } },
    "@/lib/cron-auth": { hasCronAuthorization: (value, secret) => value === `Bearer ${secret}` },
  });
}

test("campaign validation canonicalizes business homepages while preserving supported directory paths", () => {
  const result = validation.parseBotCampaign(campaign({ sources: [{ kind: "business", url: "https://www.sample-business.co.za/about?tracking=ignored" }, { kind: "directory", url: "https://directory-business.co.za/list/local/" }] }));
  assert.deepEqual(plain(result.sources), [{ kind: "business", url: "https://www.sample-business.co.za/" }, { kind: "directory", url: "https://directory-business.co.za/list/local/" }]);
});

test("campaign validation rejects duplicate canonical hosts, private sources, unsafe directory paths and unsupported products", () => {
  for (const body of [
    campaign({ sources: [{ kind: "business", url: "https://www.sample-business.co.za/" }, { kind: "business", url: "https://sample-business.co.za/" }] }),
    campaign({ sources: [{ kind: "directory", url: "https://127.0.0.1/" }] }),
    campaign({ sources: [{ kind: "directory", url: "https://directory-business.co.za/admin" }] }),
    campaign({ sources: [{ kind: "directory", url: "https://directory-business.co.za/list?next=http://localhost" }] }),
    campaign({ sources: [{ kind: "directory", url: "https://maps.google.com/" }] }),
    campaign({ productKey: "unknown" }), campaign({ dailyLimit: 0 }), campaign({ dailyLimit: 21 }), campaign({ maxSites: 1.5 }),
    campaign({ unexpected: true }), campaign({ sources: [] }),
    campaign({ sources: [{ kind: "business", url: "https://one-business.co.za/" }, { kind: "business", url: "https://two-business.co.za/" }], maxSites: 1 }),
  ]) assert.equal(validation.parseBotCampaign(body), null, JSON.stringify(body));
});

test("every bot mutation authenticates before origin checks, service calls or worker execution", async () => {
  for (const [kind, method] of [["campaign", "POST"], ["campaign", "PATCH"], ["process", "POST"], ["import", "POST"]]) {
    const state = routeState({ authenticated: false });
    const response = await (await route(kind, state))[method](request());
    assert.equal(response.status, 401);
    assert.equal(state.serviceCalls, 0);
    assert.equal(state.originCalls.length, 0);
    assert.equal(state.workerCalls, 0);
  }
});

test("bot mutations require an explicit allowed staff origin before reading bodies or touching storage", async () => {
  for (const [kind, method] of [["campaign", "POST"], ["campaign", "PATCH"], ["process", "POST"], ["import", "POST"]]) {
    const state = routeState({ originAllowed: false });
    const response = await (await route(kind, state))[method](request({}, { origin: null }));
    assert.equal(response.status, 403);
    assert.deepEqual(state.originCalls, [true]);
    assert.equal(state.serviceCalls, 0);
    assert.equal(state.workerCalls, 0);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
});

test("campaign creation validates limits and rejects large bodies before service access", async () => {
  for (const [body, extra, expected] of [[campaign({ maxSites: 0 }), {}, 400], [null, { raw: "x".repeat(48_001) }, 413], [null, { raw: "{" }, 400]]) {
    const state = routeState();
    const response = await (await route("campaign", state)).POST(request(body, extra));
    assert.equal(response.status, expected);
    assert.equal(state.serviceCalls, 0);
  }
});

test("valid campaign creation stores only normalized sources through the service-only command and user-scoped read", async () => {
  const state = routeState();
  const response = await (await route("campaign", state)).POST(request(campaign({ productKey: "biosync" })));
  assert.equal(response.status, 201);
  assert.deepEqual(plain(state.rpcCalls), [["create_outreach_bot_campaign", { p_name: "Local service research", p_product_key: "biosync", p_industry: "services", p_city: "Durban", p_daily_limit: 3, p_max_sites: 5, p_sources: [{ kind: "business", url: "https://sample-business.co.za/" }], p_created_by: ownerId }]]);
  assert.equal(state.queries[0].columns, shared.botCampaignSelect);
  assert.deepEqual(state.queries[0].filters, [["id", campaignId]]);
});

test("bot read returns bounded RLS-scoped views excluding lease tokens and creator identities", async () => {
  const state = routeState();
  const response = await (await route("campaign", state)).GET();
  assert.equal(response.status, 200);
  assert.equal(state.serviceCalls, 0);
  assert.equal(state.queries.length, 2);
  for (const query of state.queries) {
    assert.equal(query.limit, 100);
    assert.doesNotMatch(query.columns, /lease|created_by|secret/);
  }
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("campaign status command rejects completed/unknown inputs and handles active-cap conflicts", async () => {
  for (const value of [{ id: campaignId, status: "completed" }, { id: "bad", status: "paused" }, { id: campaignId, status: "paused", extra: true }]) {
    const state = routeState();
    assert.equal((await (await route("campaign", state)).PATCH(request(value))).status, 400);
    assert.equal(state.serviceCalls, 0);
  }
  const state = routeState();
  assert.equal((await (await route("campaign", state)).PATCH(request({ id: campaignId, status: "paused" }))).status, 200);
  assert.deepEqual(plain(state.rpcCalls), [["set_outreach_bot_campaign_status", { p_id: campaignId, p_status: "paused" }]]);
  const conflict = routeState({ rpcError: { code: "22023" } });
  assert.equal((await (await route("campaign", conflict)).PATCH(request({ id: campaignId, status: "active" }))).status, 409);
});

test("processing accepts only an empty object and honors fail-closed rate protection", async () => {
  for (const body of [{ limit: 1000 }, [], null]) {
    const state = routeState();
    assert.equal((await (await route("process", state)).POST(request(body))).status, 400);
    assert.equal(state.workerCalls, 0);
  }
  for (const [overrides, expected] of [[{ rateAllowed: false }, 429], [{ rateError: true }, 503]]) {
    const state = routeState(overrides);
    assert.equal((await (await route("process", state)).POST(request())).status, expected);
    assert.equal(state.workerCalls, 0);
  }
  const state = routeState();
  assert.equal((await (await route("process", state)).POST(request())).status, 200);
  assert.equal(state.workerCalls, 1);
});

test("review import accepts only a job ID and delegates idempotency and DNC checks to one transaction", async () => {
  const state = routeState();
  const response = await (await route("import", state)).POST(request({ jobId }));
  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), { prospectId: ownerId, imported: false });
  assert.deepEqual(plain(state.rpcCalls), [["import_outreach_bot_result", { p_job_id: jobId }]]);
  const malicious = routeState();
  assert.equal((await (await route("import", malicious)).POST(request({ jobId, permission_status: "opted_in" }))).status, 400);
  assert.equal(malicious.serviceCalls, 0);
  const suppressed = routeState({ rpcError: { code: "22023", message: "private provider detail" } });
  const denied = await (await route("import", suppressed)).POST(request({ jobId }));
  assert.equal(denied.status, 409);
  assert.doesNotMatch(JSON.stringify(denied.body), /private provider detail/);
});

test("cron rejects unsigned callers before running the bot", async () => {
  const state = routeState();
  const handler = (await route("cron", state)).GET;
  assert.equal((await handler(new Request(`${origin}/api/cron/outreach-bot`))).status, 401);
  assert.equal(state.workerCalls, 0);
  assert.equal((await handler(new Request(`${origin}/api/cron/outreach-bot`, { headers: { authorization: "Bearer synthetic-cron-secret" } }))).status, 200);
  assert.equal(state.workerCalls, 1);
});

function workerState(overrides = {}) {
  const state = { claims: [{ id: jobId, campaign_id: campaignId, canonical_host: "sample-business.co.za", source_url: "https://sample-business.co.za/", seed_kind: "business", lease_token: "current-lease" }], campaign: { id: campaignId, status: "active", product_key: "biosync", industry: "services" }, suppressed: false, finishes: [], finishResult: "completed", crawlCalls: [], discoveryCalls: [], claimCalls: 0, ...overrides };
  state.service = {
    async rpc(name, args) {
      if (name === "claim_outreach_bot_job") { state.claimCalls += 1; return { data: state.claims.length ? [state.claims.shift()] : [], error: null }; }
      if (name === "outreach_bot_source_suppressed") return { data: state.suppressed, error: state.suppressionError ?? null };
      if (name === "finish_outreach_bot_job") { state.finishes.push(args); return { data: state.finishResult, error: state.finishError ?? null }; }
      throw new Error(`Unexpected RPC ${name}`);
    },
    from() { const chain = { select() { return chain; }, eq() { return chain; }, async maybeSingle() { return { data: state.campaign, error: null }; } }; return chain; },
  };
  return state;
}
async function worker(state, globals = {}) {
  return (await compile(paths.worker, {
    "server-only": {},
    "@/lib/supabase/service": { createServiceClient: () => state.service },
    "@/lib/business-crawler": {
      crawlBusinessWebsite: async (url) => { state.crawlCalls.push(url); if (state.crawlError) throw state.crawlError; return { sourceUrl: url, businessName: "Sample Business", checkedAt: "2026-10-18T10:00:00Z", contacts: [], pageUrls: [url], observations: [], title: "Sample Business", description: "Public business page", heading: "Welcome", hasViewport: true, hasBookingLink: false }; },
      discoverBusinessWebsites: async (url) => { state.discoveryCalls.push(url); return { sourceUrl: url, checkedAt: "2026-10-18T10:00:00Z", discoveredUrls: ["https://found-business.co.za/about", "https://found-business.co.za/"] }; },
    },
    "@/lib/website-audit": { normalizeResearchUrl, WebsiteAuditError },
    "@/lib/products": { getOutreachProduct: (key) => ({ id: key, summary: "A product idea to discuss", capabilities: ["Reviewed capability"] }) },
    "@/lib/outreach": { createWhatsAppDraft: (_name, _industry, _observation, key) => `Reviewed ${key} draft` },
  }, globals)).processOutreachBot;
}

test("worker saves product-specific evidence only through the exact leased completion transaction", async () => {
  const state = workerState();
  const summary = await (await worker(state))();
  assert.deepEqual(plain(summary), { processed: 1, completed: 1, failed: 0, skipped: 0, messagesSent: 0 });
  assert.equal(state.crawlCalls.length, 1);
  assert.equal(state.finishes[0].p_id, jobId);
  assert.equal(state.finishes[0].p_lease_token, "current-lease");
  assert.equal(state.finishes[0].p_result.suggestion.productKey, "biosync");
  assert.equal(state.finishes[0].p_result.suggestion.requiresHumanReview, true);
  assert.equal(state.finishes[0].p_result.suggestion.draft, "Reviewed biosync draft");
});

test("worker never fetches paused or suppressed sources and fails closed on suppression storage failure", async () => {
  for (const overrides of [{ campaign: { status: "paused" }, finishResult: "lost_lease" }, { suppressed: true, finishResult: "skipped" }, { suppressionError: { code: "unavailable" }, finishResult: "queued" }]) {
    const state = workerState(overrides);
    await (await worker(state))();
    assert.equal(state.crawlCalls.length, 0);
    assert.equal(state.discoveryCalls.length, 0);
    assert.equal(state.finishes[0].p_result, null);
  }
});

test("directory completion canonicalizes and deduplicates discovered business roots in the same result command", async () => {
  const state = workerState({ claims: [{ id: jobId, campaign_id: campaignId, seed_kind: "directory", source_url: "https://directory-business.co.za/list", lease_token: "directory-lease" }] });
  await (await worker(state))();
  assert.equal(state.crawlCalls.length, 0);
  assert.equal(state.discoveryCalls.length, 1);
  assert.deepEqual(plain(state.finishes[0].p_discovered_urls), ["https://found-business.co.za/"]);
  assert.equal(state.finishes[0].p_result.kind, "directory");
});

test("stale leases cannot contribute a published result or overwrite another worker", async () => {
  const state = workerState({ finishResult: "lost_lease" });
  assert.equal((await (await worker(state))()).processed, 0);
  assert.equal(state.finishes.length, 1);
  assert.equal(state.finishes[0].p_lease_token, "current-lease");
});

test("transient crawler failures contain only a safe code and represent bounded retry attempts without sending messages", async () => {
  const state = workerState({ crawlError: new WebsiteAuditError("timeout"), finishResult: "queued" });
  const summary = await (await worker(state))();
  assert.equal(summary.failed, 1);
  assert.equal(summary.messagesSent, 0);
  assert.equal(state.finishes[0].p_status, "failed");
  assert.equal(state.finishes[0].p_error_code, "timeout");
  assert.equal(state.finishes[0].p_result, null);
});

test("each bot invocation is capped at three claims and leaves time for the next bounded crawler", async () => {
  const one = workerState().claims[0];
  const state = workerState({ claims: [one, one, one, one, one] });
  assert.equal((await (await worker(state))()).processed, 3);
  assert.equal(state.claimCalls, 3);
  const slow = workerState({ claims: [one, one] });
  let tick = 0;
  class Clock extends Date { static now() { return [0, 0, 70_000][tick++] ?? 70_000; } }
  assert.equal((await (await worker(slow, { Date: Clock }))()).processed, 1);
  assert.equal(slow.claimCalls, 1);
});

test("storage publication errors surface as failure while leaving durable leases for recovery", async () => {
  const state = workerState({ finishError: { code: "database_unavailable", message: "provider secret detail" } });
  await assert.rejects((await worker(state))(), (error) => error.message === "Bot research results could not be saved.");
});
