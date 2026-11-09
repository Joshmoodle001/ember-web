import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { isClientRegistrationEnabled } from "../src/lib/client-registration.ts";

test("registration is disabled without a readiness setting", () => assert.equal(isClientRegistrationEnabled(undefined), false));
test("registration is disabled for false or empty settings", () => { for (const value of ["false", ""]) assert.equal(isClientRegistrationEnabled(value), false); });
test("registration does not enable for ambiguous truthy settings", () => { for (const value of ["TRUE", "1", " true", "true ", "yes"]) assert.equal(isClientRegistrationEnabled(value), false); });
test("only explicit true enables registration", () => assert.equal(isClientRegistrationEnabled("true"), true));
test("public registration cannot create accounts even when an old readiness flag is enabled", async () => {
  const source = await readFile(new URL("../src/app/api/account/register/route.ts", import.meta.url), "utf8");
  assert.match(source, /invitation only/);
  assert.match(source, /status: 403/);
  assert.doesNotMatch(source, /auth\.signUp|CLIENT_REGISTRATION_ENABLED|readLimitedText/);
});
