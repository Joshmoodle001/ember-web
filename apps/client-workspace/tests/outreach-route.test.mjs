import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readLimitedText, RequestBodyTooLargeError } from "../src/lib/request-body.ts";

const require = createRequire(import.meta.url);
const outreachRoutePath = new URL("../src/app/api/admin/outreach/route.ts", import.meta.url);
const placesRoutePath = new URL("../src/app/api/admin/outreach/search/route.ts", import.meta.url);
const migrationPath = new URL("../supabase/migrations/20261016142553_outreach_prospects.sql", import.meta.url);

async function loadRoute(path, state, method = "POST") {
  const source = await readFile(path, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const compiledModule = { exports: {} };
  const nextResponse = { json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: new Headers(init.headers) }) };
  const mocks = {
    "next/server": { NextResponse: nextResponse },
    "@/lib/admin": { requireAdmin: async () => state.auth },
    "@/lib/staff-origin": { hasAllowedStaffOrigin: (request, requireOrigin = false) => { state.staffOriginCalls += 1; const origin = request.headers.get("origin"); return origin === "https://portal.emberweb.co.za" || (!requireOrigin && origin === null); } },
    "@/lib/request-body": { readLimitedText, RequestBodyTooLargeError },
    "@/lib/rate-limit": { checkRateLimits: async (client, limits) => { state.rateLimitCalls.push({ client, limits }); return state.rateLimitAllowed; } },
    "@/lib/supabase/service": { createServiceClient: () => { state.serviceClientCalls += 1; return { synthetic: true }; } },
    "@/lib/google-places": {
      isGooglePlacesConfigured: () => state.placesConfigured,
      searchGooglePlaces: async (...args) => { state.placesCalls.push(args); return state.placesResults; },
    },
  };
  const sandboxRequire = (id) => mocks[id] ?? require(id);
  vm.runInNewContext(compiled, { exports: compiledModule.exports, module: compiledModule, require: sandboxRequire, console, Date, URL, Headers, process: { env: {} } });
  return compiledModule.exports[method];
}

function createState({ authenticated = true, placesConfigured = true, rateLimitAllowed = true, row = null, databaseError = null, prospects = [], preparations = [] } = {}) {
  const state = {
    serviceClientCalls: 0,
    rateLimitCalls: [],
    placesCalls: [],
    staffOriginCalls: 0,
    selectResults: { outreach_prospects: prospects, outreach_preparations: preparations },
    placesResults: [{ placeId: "synthetic-place", name: "Example Studio" }],
    placesConfigured,
    rateLimitAllowed,
    auth: null,
  };
  state.database = {
    calls: [],
    from(table) {
      state.database.calls.push({ op: "from", table });
      return {
        select(columns) {
          const query = { op: "select", table, columns, orders: [], limit: null };
          state.database.calls.push(query);
          const chain = {
            order(column, options) { query.orders.push([column, options]); return chain; },
            limit(value) { query.limit = value; return chain; },
            then(resolve, reject) {
              query.terminal = "then";
              const data = (state.selectResults[table] ?? []).slice(0, query.limit ?? undefined);
              return Promise.resolve({ data, error: null }).then(resolve, reject);
            },
          };
          return chain;
        },
        insert(values) {
          const query = { op: "insert", table, values, selected: null };
          state.database.calls.push(query);
          const chain = {
            select(columns) { query.selected = columns; return chain; },
            async single() {
              query.terminal = "single";
              if (databaseError) return { data: null, error: databaseError };
              const saved = { id: "893b1f16-8b31-43e6-9a75-1d28bf380201", ...values, created_at: "2026-10-16T00:00:00Z", updated_at: "2026-10-16T00:00:00Z" };
              return { data: saved, error: null };
            },
          };
          return chain;
        },
        update(values) {
          const query = { op: "update", table, values, filters: [], selected: null };
          state.database.calls.push(query);
          const chain = {
            eq(column, value) { query.filters.push([column, value]); return chain; },
            select(columns) { query.selected = columns; return chain; },
            async maybeSingle() { query.terminal = "maybeSingle"; return { data: row, error: databaseError }; },
          };
          return chain;
        },
      };
    },
  };
  state.auth = authenticated
    ? { ok: true, user: { id: "synthetic-admin" }, supabase: state.database }
    : { ok: false, response: { status: 401, body: { error: "Unauthorized" } } };
  return state;
}

function request(body, origin = "https://portal.emberweb.co.za") {
  return new Request("https://portal.emberweb.co.za/api/admin/outreach", {
    method: "POST",
    headers: { ...(origin === null ? {} : { origin }), ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function validProspect(overrides = {}) {
  return {
    business_name: "Example Studio",
    industry: "beauty",
    city: "Cape Town",
    website: "studio.example",
    phone: "+27 21 555 0100",
    email: "OWNER@EXAMPLE.ORG",
    notes: "Owner confirmed the booking process needs attention.",
    permission_status: "unconfirmed",
    permission_note: "",
    status: "research",
    ...overrides,
  };
}

test("prospect save validates origin, fields, URL scheme, email, and permission evidence before database writes", async () => {
  for (const [body, expected] of [
    [validProspect(), { origin: "https://attacker.example", status: 403 }],
    [validProspect({ website: "javascript:alert(1)" }), { status: 400 }],
    [validProspect({ website: "https://user:pass@private.example" }), { status: 400 }],
    [validProspect({ email: "owner at example" }), { status: 400 }],
    [validProspect({ permission_status: "opted_in", permission_note: "" }), { status: 400 }],
    [validProspect({ unexpected: "field" }), { status: 400 }],
  ]) {
    const state = createState();
    const handler = await loadRoute(outreachRoutePath, state);
    const response = await handler(request(body, expected.origin ?? "https://portal.emberweb.co.za"));
    assert.equal(response.status, expected.status);
    assert.equal(state.database.calls.length, 0);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
});

test("valid prospect save normalizes safe fields and persists only through the authenticated user client", async () => {
  const state = createState();
  const handler = await loadRoute(outreachRoutePath, state);
  const response = await handler(request(validProspect()));

  assert.equal(response.status, 201);
  assert.equal(response.body.prospect.business_name, "Example Studio");
  assert.equal(response.body.prospect.website, "https://studio.example/");
  assert.equal(response.body.prospect.email, "owner@example.org");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const insert = state.database.calls.find((call) => call.op === "insert");
  assert.equal(insert.table, "outreach_prospects");
  assert.equal(insert.values.permission_status, "unconfirmed");
  assert.equal(insert.values.status, "research");
  assert.equal(insert.values.product_key, "emberweb");
  assert.ok(!("id" in insert.values));
  assert.equal(insert.terminal, "single");
});

test("product selection is explicit and cannot be used to write archival or arbitrary account fields", async () => {
  const accepted = createState();
  const save = await loadRoute(outreachRoutePath, accepted);
  const response = await save(request(validProspect({ product_key: "biosync" })));
  assert.equal(response.status, 201);
  assert.equal(accepted.database.calls.find((call) => call.op === "insert").values.product_key, "biosync");
  for (const extra of [{ product_key: "other" }, { product_key: null }, { archived_at: "2026-10-18T00:00:00Z" }]) {
    const rejected = createState();
    const handler = await loadRoute(outreachRoutePath, rejected);
    assert.equal((await handler(request(validProspect(extra)))).status, 400);
    assert.equal(rejected.database.calls.length, 0);
  }
});

test("outreach GET returns private prospects and prepared messages through the authenticated client", async () => {
  const prospects = [{ id: "893b1f16-8b31-43e6-9a75-1d28bf380201", business_name: "Example Studio", permission_status: "opted_in" }];
  const preparations = [{ prospect_id: prospects[0].id, message: "A reviewed draft", prepared_at: "2026-10-16T00:00:00Z", source_updated_at: "2026-10-15T00:00:00Z" }];
  const state = createState({ prospects, preparations });
  const handler = await loadRoute(outreachRoutePath, state, "GET");
  const response = await handler();

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.prospects, prospects);
  assert.deepEqual(response.body.preparations, preparations);
  assert.equal(response.body.lookupConfigured, false);
  assert.deepEqual(state.database.calls.filter((call) => call.op === "select").map((call) => call.table), ["outreach_prospects", "outreach_preparations"]);
  assert.equal(state.staffOriginCalls, 0);
});

test("prospect save rejects unauthenticated and oversized submissions before database access", async () => {
  const unauthenticated = createState({ authenticated: false });
  const save = await loadRoute(outreachRoutePath, unauthenticated);
  assert.equal((await save(request(validProspect()))).status, 401);
  assert.equal(unauthenticated.database.calls.length, 0);

  const oversizedState = createState();
  const oversizedSave = await loadRoute(outreachRoutePath, oversizedState);
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(12_001)); controller.close(); } });
  const oversizedRequest = new Request("https://portal.emberweb.co.za/api/admin/outreach", { method: "POST", headers: { origin: "https://portal.emberweb.co.za", "content-type": "application/json" }, body, duplex: "half" });
  const oversizedResponse = await oversizedSave(oversizedRequest);
  assert.equal(oversizedResponse.status, 413);
  assert.equal(oversizedState.database.calls.length, 0);
});

test("Places route checks authentication and origin before contacting Google or the rate-limit store", async () => {
  const unauthorized = createState({ authenticated: false });
  const unauthorizedSearch = await loadRoute(placesRoutePath, unauthorized);
  assert.equal((await unauthorizedSearch(request({ query: "salons", city: "Cape Town" }))).status, 401);
  assert.equal(unauthorized.placesCalls.length, 0);
  assert.equal(unauthorized.serviceClientCalls, 0);

  const foreignOrigin = createState();
  const foreignSearch = await loadRoute(placesRoutePath, foreignOrigin);
  assert.equal((await foreignSearch(request({ query: "salons", city: "Cape Town" }, "https://attacker.example"))).status, 403);
  assert.equal(foreignOrigin.placesCalls.length, 0);
  assert.equal(foreignOrigin.serviceClientCalls, 0);
});

test("Places route returns 503 without a key, rejects oversized bodies, and never searches Google on invalid input", async () => {
  const missingKey = createState({ placesConfigured: false });
  const missingKeySearch = await loadRoute(placesRoutePath, missingKey);
  assert.equal((await missingKeySearch(request({ query: "salons" }))).status, 503);
  assert.equal(missingKey.placesCalls.length, 0);
  assert.equal(missingKey.serviceClientCalls, 0);

  const oversized = createState();
  const oversizedSearch = await loadRoute(placesRoutePath, oversized);
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(12_001)); controller.close(); } });
  const oversizedRequest = new Request("https://portal.emberweb.co.za/api/admin/outreach/search", { method: "POST", headers: { origin: "https://portal.emberweb.co.za", "content-type": "application/json" }, body, duplex: "half" });
  assert.equal((await oversizedSearch(oversizedRequest)).status, 413);
  assert.equal(oversized.placesCalls.length, 0);
  assert.equal(oversized.serviceClientCalls, 0);

  const invalid = createState();
  const invalidSearch = await loadRoute(placesRoutePath, invalid);
  assert.equal((await invalidSearch(request({ query: "x", city: "Cape Town" }))).status, 400);
  assert.equal((await invalidSearch(request({ query: "salons", ignored: true }))).status, 400);
  assert.equal(invalid.placesCalls.length, 0);
  assert.equal(invalid.serviceClientCalls, 0);
});

test("Places route rate limits per admin and returns only mocked Google results", async () => {
  const state = createState({ rateLimitAllowed: true });
  const search = await loadRoute(placesRoutePath, state);
  const response = await search(request({ query: "  salons\n", city: " Cape Town " }));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.results, state.placesResults);
  assert.equal(state.serviceClientCalls, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(state.rateLimitCalls[0].limits)), [{ scope: "google-places:admin-user", identity: "synthetic-admin", limit: 10, windowSeconds: 3600 }]);
  assert.deepEqual(state.placesCalls, [["salons", "Cape Town"]]);

  const limited = createState({ rateLimitAllowed: false });
  const limitedSearch = await loadRoute(placesRoutePath, limited);
  assert.equal((await limitedSearch(request({ query: "salons", city: "Cape Town" }))).status, 429);
  assert.equal(limited.placesCalls.length, 0);
});

test("outreach migration keeps prospect data behind workspace-admin RLS and authenticated grants", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /alter table public\.outreach_prospects enable row level security/i);
  assert.match(migration, /revoke all on public\.outreach_prospects from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert, update on public\.outreach_prospects to authenticated/i);
  for (const action of ["select", "insert", "update"]) {
    const policy = migration.match(new RegExp(`create policy outreach_prospects_admin_${action}[\\s\\S]*?;`, "i"))?.[0];
    assert.ok(policy, `expected the ${action} admin policy`);
    assert.match(policy, /to authenticated/i);
    assert.match(policy, /workspace_private\.is_workspace_admin\(\)/i);
  }
  assert.match(migration, /permission_status not in \('opted_in', 'existing_customer'\)[\s\S]*?char_length\(trim\(permission_note\)\) between 10 and 1000/i);
});
