import assert from "node:assert/strict";
import test from "node:test";
import { handleClientLogin } from "../src/lib/client-login.ts";
import { isAllowedPasswordLoginOrigin } from "../src/lib/password-login.ts";
import { parseClientLoginCredentials } from "../src/lib/username-login.ts";
const request = (body = { email: "client@example.com", password: "some password" }, origin = "https://emberweb.co.za") => new Request("https://emberweb.co.za/api/account/login", { method: "POST", headers: { origin }, body: JSON.stringify(body) });
const dependencies = (overrides = {}) => ({ nodeEnv: "production", isAllowedOrigin: isAllowedPasswordLoginOrigin, parseCredentials: parseClientLoginCredentials, readBody: async (req) => req.text(), checkRateLimits: async () => true, checkCanonicalEmailRateLimit: async () => true, resolveUsername: async () => null, dummyAuthenticate: async () => {}, authenticate: async () => "/account", ...overrides });
test("confirmed client login has fixed account destination", async () => assert.deepEqual(await handleClientLogin(request(), dependencies()), { status: 200, body: { next: "/account" } }));
test("cross-origin requests are rejected before authentication", async () => { let called = false; const result = await handleClientLogin(request(undefined, "https://evil.example"), dependencies({ authenticate: async () => { called = true; return "/account"; } })); assert.equal(result.status, 403); assert.equal(called, false); });
test("client supplied role, user or redirect cannot be submitted", async () => { for (const field of ["role", "userId", "next"]) assert.equal((await handleClientLogin(request({ email: "client@example.com", password: "password", [field]: "admin" }), dependencies())).status, 400); });
test("rate limit stops authentication", async () => { let called = false; const result = await handleClientLogin(request(), dependencies({ checkRateLimits: async () => false, authenticate: async () => { called = true; return "/account"; } })); assert.equal(result.status, 429); assert.equal(called, false); });
test("invalid or unconfirmed authentication receives generic denial", async () => assert.equal((await handleClientLogin(request(), dependencies({ authenticate: async () => null }))).status, 401));
test("authentication outages fail closed", async () => assert.equal((await handleClientLogin(request(), dependencies({ authenticate: async () => { throw new Error("private upstream error"); } }))).status, 503));

test("verified staff destination is preserved", async () => assert.deepEqual(await handleClientLogin(request(), dependencies({ authenticate: async () => "/admin" })), { status: 200, body: { next: "/admin" } }));
test("unexpected authentication destinations fail closed", async () => { for (const destination of ["https://evil.example", "//evil.example", "/admin/unknown", true]) assert.equal((await handleClientLogin(request(), dependencies({ authenticate: async () => destination }))).status, 401); });
