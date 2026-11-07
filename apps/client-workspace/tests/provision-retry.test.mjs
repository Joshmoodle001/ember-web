import assert from "node:assert/strict";
import test from "node:test";
import { shouldForgetProvisionAttempt } from "../src/lib/provision-retry.ts";

test("a definite first-attempt rejection allows a new username or client", () => {
  assert.equal(shouldForgetProvisionAttempt(false, 409, true), true);
  assert.equal(shouldForgetProvisionAttempt(false, 400, undefined), true);
});

test("uncertain server outcomes and any prior ambiguous attempt retain the retry reference", () => {
  assert.equal(shouldForgetProvisionAttempt(false, 503, undefined), false);
  assert.equal(shouldForgetProvisionAttempt(false, 409, undefined), false);
  assert.equal(shouldForgetProvisionAttempt(true, 409, true), false);
  assert.equal(shouldForgetProvisionAttempt(true, 400, undefined), false);
});
