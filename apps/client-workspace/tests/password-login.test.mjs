import assert from "node:assert/strict";
import test from "node:test";
import {
  handlePasswordLogin,
  isAllowedPasswordLoginOrigin,
  passwordLoginFailureMessage,
} from "../src/lib/password-login.ts";
import { readLimitedText, RequestBodyTooLargeError } from "../src/lib/request-body.ts";

const allowedOrigin = "https://emberweb.co.za";
const allowedEmail = "josh@example.com";

function request(body, origin = allowedOrigin) {
  return new Request("https://emberweb.co.za/api/auth/password", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-real-ip": "203.0.113.8",
    },
    body: JSON.stringify(body),
  });
}

function dependencies(overrides = {}) {
  return {
    nodeEnv: "production",
    readBody: readLimitedText,
    isBodyTooLarge: (error) => error instanceof RequestBodyTooLargeError,
    getClientIp: () => "203.0.113.8",
    checkRateLimits: async () => true,
    authenticate: async ({ email }) => ({ userEmail: email, error: null, signOut: async () => {} }),
    isAdminEmail: (email) => email === allowedEmail,
    ...overrides,
  };
}

test("canonical origins and development localhost are the only accepted origins", () => {
  assert.equal(isAllowedPasswordLoginOrigin("https://emberweb.co.za", "production"), true);
  assert.equal(isAllowedPasswordLoginOrigin("https://www.emberweb.co.za", "production"), true);
  assert.equal(isAllowedPasswordLoginOrigin("https://portal.emberweb.co.za", "production"), true);
  assert.equal(isAllowedPasswordLoginOrigin("https://evil.example", "production"), false);
  assert.equal(isAllowedPasswordLoginOrigin("http://localhost:3000", "development"), true);
  assert.equal(isAllowedPasswordLoginOrigin("http://127.0.0.1:3000", "development"), true);
  assert.equal(isAllowedPasswordLoginOrigin("http://localhost:3000", "production"), false);
  assert.equal(isAllowedPasswordLoginOrigin(null, "development"), false);
});

test("mocked Supabase password auth succeeds only with the fixed workspace path", async () => {
  const calls = [];
  const outcome = await handlePasswordLogin(request({ email: " JOSH@example.com ", password: " a secure password " }), dependencies({
    checkRateLimits: async (email, ip) => { calls.push(["limit", email, ip]); return true; },
    authenticate: async (credentials) => {
      calls.push(["sign-in", credentials]);
      return { userEmail: "josh@example.com", error: null, signOut: async () => calls.push(["sign-out"]) };
    },
  }));

  assert.deepEqual(outcome, { status: 200, body: { next: "/admin" } });
  assert.deepEqual(calls, [
    ["limit", "josh@example.com", "203.0.113.8"],
    ["sign-in", { email: "josh@example.com", password: " a secure password " }],
  ]);
});

test("invalid credentials and an authenticated unapproved email share the same generic 401", async () => {
  const invalid = await handlePasswordLogin(request({ email: allowedEmail, password: "wrong" }), dependencies({
    authenticate: async () => ({ userEmail: null, error: new Error("invalid credentials"), signOut: async () => {} }),
  }));
  let signOutCount = 0;
  const unapproved = await handlePasswordLogin(request({ email: "other@example.com", password: "correct-for-that-user" }), dependencies({
    authenticate: async () => ({ userEmail: "other@example.com", error: null, signOut: async () => { signOutCount += 1; } }),
  }));

  assert.equal(invalid.status, 401);
  assert.deepEqual(invalid, unapproved);
  assert.equal(invalid.body.error, passwordLoginFailureMessage);
  assert.equal(signOutCount, 1);
});

test("foreign origins are rejected before reading the body, rate limiting, or auth", async () => {
  let called = false;
  const outcome = await handlePasswordLogin(request({ email: allowedEmail, password: "secret" }, "https://attacker.example"), dependencies({
    readBody: async () => { called = true; throw new Error("unexpected body read"); },
    checkRateLimits: async () => { called = true; return true; },
    authenticate: async () => { called = true; throw new Error("unexpected auth"); },
  }));

  assert.equal(outcome.status, 403);
  assert.equal(called, false);
});

test("the 2,000-byte request cap rejects oversized bodies before rate limiting or auth", async () => {
  let called = false;
  const outcome = await handlePasswordLogin(request({ email: allowedEmail, password: "x".repeat(2_100) }), dependencies({
    checkRateLimits: async () => { called = true; return true; },
    authenticate: async () => { called = true; throw new Error("unexpected auth"); },
  }));

  assert.equal(outcome.status, 413);
  assert.equal(called, false);
});

test("rate-limit rejection and limiter failure both stop before password authentication", async () => {
  let authCalls = 0;
  const rejected = await handlePasswordLogin(request({ email: allowedEmail, password: "secret" }), dependencies({
    checkRateLimits: async () => false,
    authenticate: async () => { authCalls += 1; throw new Error("unexpected auth"); },
  }));
  const unavailable = await handlePasswordLogin(request({ email: allowedEmail, password: "secret" }), dependencies({
    checkRateLimits: async () => { throw new Error("rate limiter unavailable"); },
    authenticate: async () => { authCalls += 1; throw new Error("unexpected auth"); },
  }));

  assert.equal(rejected.status, 429);
  assert.equal(rejected.body.error, passwordLoginFailureMessage);
  assert.equal(unavailable.status, 503);
  assert.equal(authCalls, 0);
});
