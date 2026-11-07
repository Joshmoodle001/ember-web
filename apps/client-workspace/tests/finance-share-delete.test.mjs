import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const invoiceId = "7c0b1458-8e54-4d4f-a012-911ce2fb2310";
const routePath = new URL("../src/app/api/admin/finance/[id]/share/route.ts", import.meta.url);

async function loadDeleteRoute(state) {
  const source = await readFile(routePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const compiledModule = { exports: {} };
  const mocks = {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: new Headers(init.headers) }) } },
    "@/lib/admin": { requireAdmin: async () => state.auth },
    "@/lib/public-links": { getWorkspaceSiteOrigin: () => "https://portal.example.test" },
  };
  const sandboxRequire = (id) => mocks[id] ?? require(id);
  vm.runInNewContext(compiled, { exports: compiledModule.exports, module: compiledModule, require: sandboxRequire, console, Date, URL, Headers });
  return compiledModule.exports.DELETE;
}

function createFakeSupabase({ row, error = null }) {
  const calls = [];
  const client = {
    from(table) {
      calls.push({ op: "from", table });
      return {
        update(values) {
          const query = { op: "update", table, values, filters: [], selection: null };
          calls.push(query);
          const chain = {
            eq(column, value) { query.filters.push(["eq", column, value]); return chain; },
            select(columns) { query.selection = columns; return chain; },
            async maybeSingle() {
              query.terminal = "maybeSingle";
              if (error) return { data: null, error };
              if (!row) return { data: null, error: null };
              Object.assign(row, values);
              return { data: { id: row.id }, error: null };
            },
          };
          return chain;
        },
      };
    },
  };
  return { client, calls };
}

function authOk(supabase) { return { ok: true, supabase }; }
function context(id) { return { params: Promise.resolve({ id }) }; }
async function deleteLink(auth, id = invoiceId, supabase = null) {
  const state = { auth: auth ?? authOk(supabase) };
  const handler = await loadDeleteRoute(state);
  return { response: await handler(new Request("https://local.test/"), context(id)), state };
}

test("DELETE rejects unauthenticated requests without touching the database", async () => {
  const db = createFakeSupabase({ row: { id: invoiceId } });
  const authResponse = { status: 401, body: { error: "Unauthorized" }, headers: new Headers() };
  const { response } = await deleteLink({ ok: false, response: authResponse, supabase: db.client }, invoiceId);

  assert.equal(response, authResponse);
  assert.equal(db.calls.length, 0);
});

test("DELETE rejects malformed invoice IDs before making a database call", async () => {
  const db = createFakeSupabase({ row: { id: invoiceId } });
  const { response } = await deleteLink(null, "not-a-uuid", db.client);

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(db.calls.length, 0);
});

for (const status of ["sent", "paid"]) {
  test(`DELETE revokes a ${status} invoice link without changing amount or status`, async () => {
    const row = { id: invoiceId, status, amount_cents: 145000, share_token_hash: "a".repeat(64) };
    const db = createFakeSupabase({ row });
    const { response } = await deleteLink(null, invoiceId, db.client);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(row.share_token_hash, null);
    assert.equal(row.amount_cents, 145000);
    assert.equal(row.status, status);
    assert.deepEqual(db.calls.filter((call) => call.op === "update").map((call) => Object.keys(call.values).sort()), [
      ["share_token_hash", "updated_at"],
    ]);
    assert.deepEqual(db.calls.find((call) => call.op === "update").filters, [["eq", "id", invoiceId]]);
    assert.equal(db.calls.find((call) => call.op === "update").selection, "id");
  });
}

test("DELETE reports a database failure as 503 and keeps the response non-cacheable", async () => {
  const db = createFakeSupabase({ row: { id: invoiceId }, error: { code: "synthetic-db-error" } });
  const { response } = await deleteLink(null, invoiceId, db.client);

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(db.calls.filter((call) => call.op === "update").length, 1);
});

test("DELETE returns 404 when no invoice was updated and keeps the response non-cacheable", async () => {
  const db = createFakeSupabase({ row: null });
  const { response } = await deleteLink(null, invoiceId, db.client);

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("PayFast attempt lookup only matches a non-null supplied hash to the stored hash", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261013075407_qualify_payment_attempt_columns.sql", import.meta.url), "utf8");
  const lookup = migration.match(/select i\.\* into invoice_row[\s\S]*?for update;/i)?.[0];

  assert.ok(lookup, "expected the invoice lookup used by the payment-attempt reservation function");
  assert.match(migration, /if\s+p_token_hash\s+is\s+null\s+or\s+p_token_hash\s*!~/i);
  assert.match(lookup, /where\s+i\.share_token_hash\s*=\s*p_token_hash/i);
  assert.doesNotMatch(lookup, /coalesce\s*\(\s*i\.share_token_hash/i);
  // PostgreSQL equality with NULL is UNKNOWN, so revoked (NULL) hashes cannot match a token.
});
