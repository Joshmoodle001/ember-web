import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { parseNewClient } from "../src/lib/client-management.ts";

const valid = { action: "create_client", fullName: " Example Person ", email: " OWNER@example.com ", company: " Example Business " };
test("new business normalizes contact fields without generating access", () => assert.deepEqual(parseNewClient(valid), { full_name: "Example Person", email: "owner@example.com", company: "Example Business" }));
test("business name is optional and empty values become null", () => { for (const company of [undefined, null, "", "  "]) assert.equal(parseNewClient({ ...valid, company }).company, null); });
test("contact name bounds and company bounds are enforced", () => {
  for (const fullName of ["x", " ", "x".repeat(161), 123, "a\0b"]) assert.equal(parseNewClient({ ...valid, fullName }), null);
  assert.notEqual(parseNewClient({ ...valid, fullName: "x".repeat(160), company: "x".repeat(180) }), null);
  for (const company of ["x".repeat(181), true, "a\0b"]) assert.equal(parseNewClient({ ...valid, company }), null);
});
test("malformed and overlong contact emails are rejected", () => { for (const email of ["", "a@", "a@example", "a b@example.com", "a".repeat(255) + "@example.com", "a\0b@example.com", null]) assert.equal(parseNewClient({ ...valid, email }), null); });
test("submitted access, identity, inquiry and internal fields cannot be created", () => { for (const field of ["role", "userId", "membership", "inquiry_id", "archived_at", "id", "password"]) assert.equal(parseNewClient({ ...valid, [field]: "forged" }), null); });
test("unsupported shapes and actions fail closed", () => { for (const value of [null, [], "input", {}, { ...valid, action: "grant" }]) assert.equal(parseNewClient(value), null); });
test("business creation remains behind staff and origin guards and uses authenticated RLS", async () => {
  const source = await readFile(new URL("../src/app/api/admin/client-access/route.ts", import.meta.url), "utf8");
  const start = source.indexOf('if(body.action==="create_client")');
  const end = source.indexOf('else if(body.action==="grant")', start);
  assert.ok(start > source.indexOf("requireAdmin()", source.indexOf("export async function POST")));
  assert.ok(start > source.indexOf("hasAllowedStaffOrigin(request,true)"));
  const branch = source.slice(start, end);
  assert.match(branch, /auth\.supabase\.from\("clients"\)\.insert\(client\)/);
  assert.doesNotMatch(branch, /createServiceClient|auth\.admin|client_portal_memberships|inquiries/);
});
