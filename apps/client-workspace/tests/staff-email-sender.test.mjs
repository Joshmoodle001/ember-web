import assert from "node:assert/strict";
import test from "node:test";
import { resolveStaffEmailSender } from "../src/lib/staff-email-sender.ts";

test("sender keeps the Resend onboarding default when unset or blank", () => {
  assert.equal(resolveStaffEmailSender(undefined), "EmberWeb <onboarding@resend.dev>");
  assert.equal(resolveStaffEmailSender("  "), "EmberWeb <onboarding@resend.dev>");
});

test("sender formats a configured mailbox with the fixed EmberWeb name", () => {
  assert.equal(resolveStaffEmailSender("notifications@mail.emberweb.co.za"), "EmberWeb <notifications@mail.emberweb.co.za>");
});

test("sender rejects display names, lists, malformed addresses, and header injection", () => {
  for (const value of [
    "EmberWeb <notifications@mail.emberweb.co.za>",
    "notifications@mail.emberweb.co.za, attacker@example.com",
    "notifications@mail.emberweb.co.za\r\nBcc: attacker@example.com",
    "missing-at-sign",
    "two..dots@mail.emberweb.co.za",
    ".notify@mail.emberweb.co.za",
    "notify.@mail.emberweb.co.za",
    "notifications@-invalid.example",
    "notifications@emberweb",
  ]) assert.equal(resolveStaffEmailSender(value), null, value);
});
