import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { isClientRegistrationEnabled } from "../src/lib/client-registration.ts";

test("registration is disabled without a readiness setting", () => assert.equal(isClientRegistrationEnabled(undefined), false));
test("registration is disabled for false or empty settings", () => { for (const value of ["false", ""]) assert.equal(isClientRegistrationEnabled(value), false); });
test("registration does not enable for ambiguous truthy settings", () => { for (const value of ["TRUE", "1", " true", "true ", "yes"]) assert.equal(isClientRegistrationEnabled(value), false); });
test("only explicit true enables registration", () => assert.equal(isClientRegistrationEnabled("true"), true));
test("registration route gates before credential parsing and signup", async () => {
  const source = await readFile(new URL("../src/app/api/account/register/route.ts", import.meta.url), "utf8");
  const guard = source.indexOf("if (!isClientRegistrationEnabled(process.env.CLIENT_REGISTRATION_ENABLED))");
  assert.ok(guard > source.indexOf("if (!origin)"));
  assert.ok(guard < source.indexOf("readLimitedText(request"));
  assert.ok(guard < source.indexOf("supabase.auth.signUp"));
  assert.match(source.slice(guard, source.indexOf("let body:", guard)), /status: 503/);
});
