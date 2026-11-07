import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PAYFAST_ITN_CIDRS,
  getPayFastItnCidrs,
  getVercelClientIp,
  isPayFastItnIpAllowed,
  isTrustedPayFastItnSource,
} from "../src/lib/payfast-source-ip.ts";

test("accepts both ends of every published PayFast IPv4 range and rejects adjacent addresses", () => {
  const cases = [
    ["197.97.145.143", false], ["197.97.145.144", true], ["197.97.145.159", true], ["197.97.145.160", false],
    ["41.74.179.191", false], ["41.74.179.192", true], ["41.74.179.223", true], ["41.74.179.224", false],
    ["102.216.35.255", false], ["102.216.36.0", true], ["102.216.36.15", true], ["102.216.36.16", false],
    ["102.216.36.127", false], ["102.216.36.128", true], ["102.216.36.143", true], ["102.216.36.144", false],
    ["144.126.193.138", false], ["144.126.193.139", true], ["144.126.193.140", false],
  ];

  for (const [ip, expected] of cases) {
    assert.equal(isPayFastItnIpAllowed(ip, DEFAULT_PAYFAST_ITN_CIDRS), expected, ip);
  }
});

test("rejects malformed, non-IPv4, and noncanonical CIDR configuration", () => {
  assert.equal(isPayFastItnIpAllowed("not-an-ip", DEFAULT_PAYFAST_ITN_CIDRS), false);
  assert.equal(isPayFastItnIpAllowed("2001:db8::1", DEFAULT_PAYFAST_ITN_CIDRS), false);
  assert.equal(getPayFastItnCidrs("198.51.100.0/24, broken"), null);
  assert.equal(getPayFastItnCidrs("198.51.100.9/24"), null);
  assert.equal(isPayFastItnIpAllowed("198.51.100.5", null), false);
  assert.deepEqual(getPayFastItnCidrs("198.51.100.9"), ["198.51.100.9"]);
});

test("uses only a single Vercel-supplied client IP and fails closed elsewhere", () => {
  const valid = new Headers({
    "x-vercel-forwarded-for": "197.97.145.144",
    "x-forwarded-for": "198.51.100.8",
    "x-real-ip": "198.51.100.9",
  });
  assert.equal(getVercelClientIp(valid, true, "production"), "197.97.145.144");
  assert.equal(getVercelClientIp(valid, true, "preview"), "197.97.145.144");
  assert.equal(getVercelClientIp(valid, false), null);
  assert.equal(getVercelClientIp(valid, true, "development"), null);
  assert.equal(getVercelClientIp(valid, true, "custom"), null);
  assert.equal(getVercelClientIp(valid, true, undefined), null);

  assert.equal(getVercelClientIp(new Headers({ "x-forwarded-for": "197.97.145.144" }), true, "production"), null);
  assert.equal(getVercelClientIp(new Headers({ "x-real-ip": "197.97.145.144" }), true, "production"), null);
  assert.equal(getVercelClientIp(new Headers({ "x-vercel-forwarded-for": "197.97.145.144, 198.51.100.10" }), true, "production"), null);
  assert.equal(getVercelClientIp(new Headers({ "x-vercel-forwarded-for": "198.51.100.10" }), true, "production"), "198.51.100.10");

  const original = process.env.PAYFAST_ITN_ALLOWED_CIDRS;
  delete process.env.PAYFAST_ITN_ALLOWED_CIDRS;
  try {
    assert.equal(isTrustedPayFastItnSource(valid, true, "production"), true);
    assert.equal(isTrustedPayFastItnSource(valid, true, "development"), false);
    assert.equal(isTrustedPayFastItnSource(valid, false), false);
    assert.equal(isTrustedPayFastItnSource(new Headers({ "x-vercel-forwarded-for": "198.51.100.10" }), true, "production"), false);
  } finally {
    if (original === undefined) delete process.env.PAYFAST_ITN_ALLOWED_CIDRS;
    else process.env.PAYFAST_ITN_ALLOWED_CIDRS = original;
  }
});

test("an explicit CIDR override replaces the documented defaults", () => {
  const configured = getPayFastItnCidrs("198.51.100.0/24");
  assert.deepEqual(configured, ["198.51.100.0/24"]);
  assert.equal(isPayFastItnIpAllowed("198.51.100.255", configured), true);
  assert.equal(isPayFastItnIpAllowed("197.97.145.144", configured), false);
});
