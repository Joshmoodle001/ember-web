import assert from "node:assert/strict";
import test from "node:test";
import { dashboardDestination, legacyClientLoginPath } from "../src/lib/login-destination.ts";

test("confirmed approved identity opens staff dashboard", () => assert.equal(dashboardDestination({ email: "OWNER@example.com", email_confirmed_at: "2026-10-23" }, ["owner@example.com"]), "/admin"));
test("confirmed customer opens their account irrespective of submitted role metadata", () => assert.equal(dashboardDestination({ email: "client@example.com", email_confirmed_at: "2026-10-23", role: "admin" }, ["owner@example.com"]), "/account"));
test("unconfirmed identities cannot route to either dashboard", () => {
  for (const user of [null, {}, { email: "owner@example.com" }, { email: "owner@example.com", email_confirmed_at: "" }]) assert.equal(dashboardDestination(user, ["owner@example.com"]), null);
});
test("empty staff allowlist grants no admin destination", () => assert.equal(dashboardDestination({ email: "owner@example.com", email_confirmed_at: "2026-10-23" }, []), "/account"));
test("legacy alias preserves known error and registration only", () => {
  assert.equal(legacyClientLoginPath({}), "/login");
  assert.equal(legacyClientLoginPath({ error: "expired", register: "1", next: "https://evil.example", role: "admin" }), "/login?error=link&register=1");
  assert.equal(legacyClientLoginPath({ error: ["link"], register: ["1"] }), "/login");
});
