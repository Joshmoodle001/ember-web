import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  completeAuthCallback,
  confirmLegacySession,
  hasLegacyAuthFragment,
  getSafeNextPath,
  isSupportedEmailOtpType,
  parseLegacyAuthFragment,
} from "../src/lib/auth-flow.ts";

test("magic-link callback stays at the exact allowlisted path without query parameters", async () => {
  const signInSource = await readFile(new URL("../src/app/api/auth/sign-in/route.ts", import.meta.url), "utf8");
  assert.match(signInSource, /new URL\("\/auth\/callback", siteOrigin\)/);
  assert.doesNotMatch(signInSource, /callbackUrl\.searchParams|callbackUrl\.search\s*=/);
  assert.equal(new URL("/auth/callback", "https://portal.emberweb.co.za").toString(), "https://portal.emberweb.co.za/auth/callback");
});

test("keeps only same-site return paths", () => {
  assert.equal(getSafeNextPath("/admin/finance?tab=invoices"), "/admin/finance?tab=invoices");
  assert.equal(getSafeNextPath("//evil.example/admin"), "/admin");
  assert.equal(getSafeNextPath("https://evil.example/"), "/admin");
  assert.equal(getSafeNextPath("/\\evil.example/"), "/admin");
  assert.equal(getSafeNextPath(null), "/admin");
});

test("accepts only email, invite and recovery token-hash verification types", () => {
  assert.equal(isSupportedEmailOtpType("email"), true);
  assert.equal(isSupportedEmailOtpType("invite"), true);
  assert.equal(isSupportedEmailOtpType("recovery"), true);
  assert.equal(isSupportedEmailOtpType("magiclink"), false);
  assert.equal(isSupportedEmailOtpType(null), false);
});

test("legacy fragment parsing requires both session tokens and never returns provider error text", () => {
  assert.deepEqual(parseLegacyAuthFragment("#access_token=access&refresh_token=refresh&type=invite"), {
    kind: "session",
    accessToken: "access",
    refreshToken: "refresh",
  });
  assert.deepEqual(parseLegacyAuthFragment("#access_token=only-access"), { kind: "missing" });
  assert.deepEqual(parseLegacyAuthFragment("#error=access_denied&error_description=private%20detail"), { kind: "error" });
  assert.deepEqual(parseLegacyAuthFragment(""), { kind: "missing" });
  assert.equal(hasLegacyAuthFragment("#access_token=partial"), true);
  assert.equal(hasLegacyAuthFragment("#error=access_denied"), true);
  assert.equal(hasLegacyAuthFragment("#type=invite"), false);
});

test("PKCE callback exchange uses a mocked auth session and stops after success", async () => {
  const calls = [];
  const outcome = await completeAuthCallback({
    async exchangeCodeForSession(code) {
      calls.push(["exchange", code]);
      return { error: null };
    },
    async verifyOtp(params) {
      calls.push(["verify", params]);
      return { error: null };
    },
  }, { code: "synthetic-code", tokenHash: null, type: null });

  assert.equal(outcome, "completed");
  assert.deepEqual(calls, [["exchange", "synthetic-code"]]);
});

test("token-hash callback accepts email/invite and rejects other types without verifying them", async () => {
  const calls = [];
  const auth = {
    async exchangeCodeForSession() {
      throw new Error("unexpected code exchange");
    },
    async verifyOtp(params) {
      calls.push(params);
      return { error: null };
    },
  };

  assert.equal(await completeAuthCallback(auth, { code: null, tokenHash: "synthetic-email", type: "email" }), "completed");
  assert.equal(await completeAuthCallback(auth, { code: null, tokenHash: "synthetic-invite", type: "invite" }), "completed");
  assert.equal(await completeAuthCallback(auth, { code: null, tokenHash: "synthetic-recovery", type: "recovery" }), "completed");
  assert.equal(await completeAuthCallback(auth, { code: null, tokenHash: "synthetic-other", type: "magiclink" }), "invalid");
  assert.deepEqual(calls, [
    { token_hash: "synthetic-email", type: "email" },
    { token_hash: "synthetic-invite", type: "invite" },
    { token_hash: "synthetic-recovery", type: "recovery" },
  ]);
});

test("legacy completion persists a mocked session then confirms the user", async () => {
  const calls = [];
  const auth = {
    async setSession(tokens) {
      calls.push(["setSession", tokens]);
      return { error: null };
    },
    async getUser() {
      calls.push(["getUser"]);
      return { data: { user: { id: "synthetic-user" } }, error: null };
    },
  };

  assert.equal(await confirmLegacySession(auth, { kind: "session", accessToken: "access", refreshToken: "refresh" }), true);
  assert.equal(await confirmLegacySession(auth, { kind: "missing" }), false);
  assert.deepEqual(calls, [
    ["setSession", { access_token: "access", refresh_token: "refresh" }],
    ["getUser"],
  ]);
});
