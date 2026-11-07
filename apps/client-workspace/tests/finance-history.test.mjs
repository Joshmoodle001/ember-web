import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { filterRecordedPayments } from "../src/lib/finance-history.ts";

const records = [
  { id: "a", invoices: { client_id: "client-a", invoice_number: "EW-001", clients: { company: "Acme", full_name: "Alice" } } },
  { id: "b", invoices: { client_id: "client-b", invoice_number: "EW-002", clients: { company: null, full_name: "Bob" } } },
  { id: "missing", invoices: null },
];
test("payment filters combine client scope and case-insensitive invoice/business search", () => {
  assert.deepEqual(filterRecordedPayments(records, "client-a", " acME ").map((record) => record.id), ["a"]);
  assert.deepEqual(filterRecordedPayments(records, "client-a", "EW-002"), []);
  assert.deepEqual(filterRecordedPayments(records, "", "bob").map((record) => record.id), ["b"]);
  assert.deepEqual(filterRecordedPayments(records, "", "").map((record) => record.id), ["a", "b", "missing"]);
  assert.equal(records.length, 3);
});

async function loadRoute({ authorized = true, paymentError = false } = {}) {
  const queries = [];
  const supabase = { from(table) {
    const query = { table };
    queries.push(query);
    const chain = {
      select(columns) { query.columns = columns; return chain; },
      order(column, options) { query.order = { column, ...options }; return chain; },
      not(column, operator, value) { query.filter = { column, operator, value }; return chain; },
      limit(count) { query.limit = count; return chain; },
      then(resolve) { resolve({ data: [], error: paymentError && query.limit === 200 ? { code: "unavailable" } : null }); },
    };
    return chain;
  } };
  const source = await readFile(new URL("../src/app/api/admin/finance/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  const denied = { status: 401 };
  const mocks = {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: new Headers(init.headers) }) } },
    "@/lib/admin": { requireAdmin: async () => authorized ? { ok: true, supabase } : { ok: false, response: denied } },
  };
  vm.runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: (name) => mocks[name], process: { env: {} }, Headers, console: { error() {} } });
  return { response: await compiledModule.exports.GET(), queries, denied };
}
test("finance history requires admin authorization before accessing records", async () => {
  const { response, denied, queries } = await loadRoute({ authorized: false });
  assert.equal(response, denied);
  assert.equal(queries.length, 0);
});
test("finance history is bounded and excludes payment provider identifiers", async () => {
  const { response, queries } = await loadRoute();
  assert.equal(response.status, 200);
  assert.equal(response.body.paymentHistoryLimit, 200);
  const history = queries.find((query) => query.limit === 200);
  assert.equal(history.table, "payments");
  assert.equal(history.order.column, "created_at");
  assert.equal(history.order.ascending, false);
  assert.match(history.columns, /invoices\(invoice_number,client_id,clients\(full_name,company\)\)/);
  assert.doesNotMatch(history.columns, /provider_reference|notify_id|attempt_id|\*/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.ok(queries.some((query) => query.filter?.column === "duplicate_of"));
});
test("payment query failure returns an error instead of a false empty history", async () => {
  const { response } = await loadRoute({ paymentError: true });
  assert.equal(response.status, 503);
  assert.equal(response.body.payments, undefined);
});
