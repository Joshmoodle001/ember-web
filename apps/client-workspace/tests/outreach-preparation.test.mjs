import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { hasCronAuthorization } from "../src/lib/cron-auth.ts";
import { createWhatsAppDraft, getIndustry } from "../src/lib/outreach.ts";
import { getOutreachProduct } from "../src/lib/products.ts";

const require = createRequire(import.meta.url);
const preparationPath = new URL("../src/lib/outreach-preparation.ts", import.meta.url);
const cronPath = new URL("../src/app/api/cron/outreach/route.ts", import.meta.url);
const manualPreparePath = new URL("../src/app/api/admin/outreach/prepare/route.ts", import.meta.url);
const ownerOrigin = "https://portal.emberweb.co.za";
const asPlainData = (value) => JSON.parse(JSON.stringify(value));

async function compileModule(path, mocks, globals = {}) {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(path, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const compiledModule = { exports: {} };
  const sandboxRequire = (id) => mocks[id] ?? require(id);
  vm.runInNewContext(compiled, { exports: compiledModule.exports, module: compiledModule, require: sandboxRequire, console, Date, URL, Headers, ...globals });
  return compiledModule.exports;
}

function createServiceState({ prospects, preparations, queryError = null, upsertError = null }) {
  const state = { prospects: [...prospects], preparations: [...preparations], queries: [], upserts: [], fetchCalls: 0 };
  state.client = {
    from(table) {
      return {
        select(columns) {
          const query = { table, columns, filters: [], nullFilters: [], orders: [], limit: null };
          state.queries.push(query);
          const chain = {
            in(column, values) { query.filters.push([column, values]); return chain; },
            is(column, value) { query.nullFilters.push([column, value]); return chain; },
            order(column, options) { query.orders.push([column, options]); return chain; },
            limit(value) { query.limit = value; return chain; },
            then(resolve, reject) {
              query.terminal = "then";
              const filter = (row) => query.filters.every(([column, values]) => values.includes(row[column])) && query.nullFilters.every(([column, value]) => (row[column] ?? null) === value);
              let data = (table === "outreach_prospects" ? state.prospects : state.preparations).filter(filter);
              for (const [column, options] of query.orders) data = [...data].sort((left, right) => options.ascending ? String(left[column]).localeCompare(String(right[column])) : String(right[column]).localeCompare(String(left[column])));
              if (query.limit !== null) data = data.slice(0, query.limit);
              return Promise.resolve({ data, error: queryError }).then(resolve, reject);
            },
          };
          return chain;
        },
        upsert(records, options) {
          state.upserts.push({ records: JSON.parse(JSON.stringify(records)), options });
          if (!upsertError) {
            for (const record of records) {
              const index = state.preparations.findIndex((item) => item.prospect_id === record.prospect_id);
              if (index < 0) state.preparations.push(JSON.parse(JSON.stringify(record)));
              else state.preparations[index] = JSON.parse(JSON.stringify(record));
            }
          }
          return Promise.resolve({ error: upsertError });
        },
      };
    },
  };
  return state;
}

async function loadPreparation(state) {
  const loaded = await compileModule(preparationPath, {
    "server-only": {},
    "@/lib/supabase/service": { createServiceClient: () => state.client },
    "@/lib/outreach": { createWhatsAppDraft, getIndustry },
    "@/lib/products": { getOutreachProduct },
  }, { fetch: async () => { state.fetchCalls += 1; throw new Error("provider calls are forbidden in this test"); } });
  return loaded.prepareOutreach;
}

function nextResponseMock() {
  return { json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: new Headers(init.headers) }) };
}

async function loadCron(state) {
  const loaded = await compileModule(cronPath, {
    "next/server": { NextResponse: nextResponseMock() },
    "@/lib/cron-auth": { hasCronAuthorization },
    "@/lib/outreach-preparation": { prepareOutreach: async () => { state.prepareCalls += 1; if (state.fail) throw new Error("synthetic prepare failure"); return state.result; } },
  }, { process: { env: { CRON_SECRET: state.secret } } });
  return loaded.GET;
}

async function loadManualPrepare(state) {
  const loaded = await compileModule(manualPreparePath, {
    "next/server": { NextResponse: nextResponseMock() },
    "@/lib/admin": { requireAdmin: async () => { state.authCalls += 1; return state.auth; } },
    "@/lib/staff-origin": { hasAllowedStaffOrigin: (request) => { state.originCalls += 1; return request.headers.get("origin") === ownerOrigin; } },
    "@/lib/outreach-preparation": { prepareOutreach: async () => { state.prepareCalls += 1; return state.result; } },
  });
  return loaded.POST;
}

function cronState(overrides = {}) {
  return { secret: "c".repeat(40), prepareCalls: 0, fail: false, result: { prepared: 1, messagesSent: 0, providerLookups: 0 }, ...overrides };
}

test("cron bearer authorization rejects absent headers and short, wrong, or different-length secrets", () => {
  const secret = "c".repeat(40);
  assert.equal(hasCronAuthorization(null, secret), false);
  assert.equal(hasCronAuthorization("Bearer " + secret, undefined), false);
  assert.equal(hasCronAuthorization("Bearer " + secret, "too-short"), false);
  assert.equal(hasCronAuthorization("Bearer " + "c".repeat(39), secret), false);
  assert.equal(hasCronAuthorization("Bearer " + "d".repeat(40), secret), false);
  assert.equal(hasCronAuthorization("Bearer " + secret, secret), true);
});

test("cron endpoint is a no-op without exact authorization and performs preparation only after a valid bearer token", async () => {
  const missing = cronState();
  const missingRoute = await loadCron(missing);
  const noHeader = await missingRoute(new Request("https://portal.example.test/api/cron/outreach"));
  assert.equal(noHeader.status, 401);
  assert.equal(noHeader.headers.get("cache-control"), "private, no-store");
  assert.equal(missing.prepareCalls, 0);

  for (const [secret, header] of [["s".repeat(31), "Bearer " + "s".repeat(31)], ["s".repeat(40), "Bearer " + "x".repeat(40)], ["s".repeat(40), "Bearer " + "s".repeat(39)]]) {
    const invalid = cronState({ secret });
    const route = await loadCron(invalid);
    assert.equal((await route(new Request("https://portal.example.test/api/cron/outreach", { headers: { authorization: header } }))).status, 401);
    assert.equal(invalid.prepareCalls, 0);
  }

  const authorized = cronState();
  const authorizedRoute = await loadCron(authorized);
  const response = await authorizedRoute(new Request("https://portal.example.test/api/cron/outreach", { headers: { authorization: `Bearer ${authorized.secret}` } }));
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, authorized.result);
  assert.equal(authorized.prepareCalls, 1);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("manual preparation checks admin auth and staff origin before running the job", async () => {
  const unauthenticated = { authCalls: 0, originCalls: 0, prepareCalls: 0, auth: { ok: false, response: { status: 401 } }, result: {} };
  const unauthorizedRoute = await loadManualPrepare(unauthenticated);
  assert.equal((await unauthorizedRoute(new Request(`${ownerOrigin}/api/admin/outreach/prepare`, { method: "POST", headers: { origin: ownerOrigin } }))).status, 401);
  assert.equal(unauthenticated.originCalls, 0);
  assert.equal(unauthenticated.prepareCalls, 0);

  const foreign = { authCalls: 0, originCalls: 0, prepareCalls: 0, auth: { ok: true }, result: {} };
  const foreignRoute = await loadManualPrepare(foreign);
  const forbidden = await foreignRoute(new Request(`${ownerOrigin}/api/admin/outreach/prepare`, { method: "POST", headers: { origin: "https://attacker.example" } }));
  assert.equal(forbidden.status, 403);
  assert.equal(foreign.prepareCalls, 0);

  const allowed = { authCalls: 0, originCalls: 0, prepareCalls: 0, auth: { ok: true }, result: { prepared: 2, messagesSent: 0, providerLookups: 0 } };
  const allowedRoute = await loadManualPrepare(allowed);
  const prepared = await allowedRoute(new Request(`${ownerOrigin}/api/admin/outreach/prepare`, { method: "POST", headers: { origin: ownerOrigin } }));
  assert.equal(prepared.status, 200);
  assert.deepEqual(prepared.body, allowed.result);
  assert.equal(allowed.prepareCalls, 1);
  assert.equal(prepared.headers.get("cache-control"), "private, no-store");
});

test("preparation selects only consented research-ready prospects, upserts idempotently, and never contacts providers or people", async () => {
  const prospects = [
    { id: "opted-eligible", business_name: "Garden Studio", industry: "beauty", permission_status: "opted_in", status: "research", updated_at: "2026-10-15T10:00:00Z" },
    { id: "customer-eligible", business_name: "Good Guesthouse", industry: "hospitality", permission_status: "existing_customer", status: "ready", updated_at: "2026-10-15T12:00:00Z" },
    { id: "unconfirmed", business_name: "Unconfirmed Co", industry: "services", permission_status: "unconfirmed", status: "research", updated_at: "2026-10-15T13:00:00Z" },
    { id: "suppressed", business_name: "No Contact", industry: "services", permission_status: "do_not_contact", status: "ready", updated_at: "2026-10-15T14:00:00Z" },
    { id: "contacted", business_name: "Already Contacted", industry: "retail", permission_status: "opted_in", status: "contacted", updated_at: "2026-10-15T15:00:00Z" },
  ];
  const preparations = [{ prospect_id: "opted-eligible", source_updated_at: "2026-10-15T10:00:00Z" }];
  const state = createServiceState({ prospects, preparations });
  const prepare = await loadPreparation(state);

  const first = await prepare();
  assert.deepEqual(asPlainData(first), { prepared: 1, messagesSent: 0, providerLookups: 0 });
  assert.deepEqual(asPlainData(state.queries[0].filters), [["permission_status", ["opted_in", "existing_customer"]], ["status", ["research", "ready"]]]);
  assert.deepEqual(asPlainData(state.upserts[0].options), { onConflict: "prospect_id" });
  assert.deepEqual(state.upserts[0].records.map((record) => record.prospect_id), ["customer-eligible"]);
  assert.equal(state.upserts[0].records[0].source_updated_at, "2026-10-15T12:00:00Z");
  assert.match(state.upserts[0].records[0].message, /illustrative demo/);
  assert.equal(state.upserts[0].records[0].concept_summary.illustrative, true);
  assert.equal(state.upserts[0].records[0].concept_summary.requiresHumanReview, true);

  const second = await prepare();
  assert.deepEqual(asPlainData(second), { prepared: 0, messagesSent: 0, providerLookups: 0 });
  assert.equal(state.upserts.length, 1, "a repeated run with unchanged source rows does not upsert again");
  assert.equal(state.fetchCalls, 0);
});

test("preparation excludes archived prospects and refreshes a changed product with no provider calls", async () => {
  const base = { business_name: "Sample workplace", industry: "retail", permission_status: "opted_in", status: "research", updated_at: "2026-10-18T10:00:00Z" };
  const state = createServiceState({ prospects: [{ ...base, id: "archived", archived_at: "2026-10-18T10:01:00Z" }, { ...base, id: "current", product_key: "biosync" }], preparations: [{ prospect_id: "current", source_updated_at: "2026-10-17T10:00:00Z" }] });
  const result = await (await loadPreparation(state))();
  assert.equal(result.prepared, 1);
  assert.deepEqual(state.upserts[0].records.map((record) => record.prospect_id), ["current"]);
  assert.match(state.upserts[0].records[0].message, /BioSync Time & Attendance/);
  assert.equal(state.upserts[0].records[0].concept_summary.productKey, "biosync");
  assert.deepEqual(asPlainData(state.queries[0].nullFilters), [["archived_at", null]]);
  assert.equal(state.fetchCalls, 0);
});

test("preparation fails closed when storage lookup or upsert fails", async () => {
  const prospect = { id: "eligible", business_name: "Example", industry: "services", permission_status: "opted_in", status: "research", updated_at: "2026-10-15T10:00:00Z" };
  const queryFailure = createServiceState({ prospects: [prospect], preparations: [], queryError: { code: "synthetic-query-failure" } });
  await assert.rejects((await loadPreparation(queryFailure))(), /storage is unavailable/);
  assert.equal(queryFailure.upserts.length, 0);

  const upsertFailure = createServiceState({ prospects: [prospect], preparations: [], upsertError: { code: "synthetic-upsert-failure" } });
  await assert.rejects((await loadPreparation(upsertFailure))(), /could not be prepared/);
  assert.equal(upsertFailure.upserts.length, 1);
  assert.equal(upsertFailure.fetchCalls, 0);
});
