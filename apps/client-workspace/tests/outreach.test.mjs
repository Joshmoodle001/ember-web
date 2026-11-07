import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWhatsAppPhone, canPrepareWhatsApp, createWhatsAppDraft, whatsappDraftUrl, getIndustry, summarizeOutreach } from "../src/lib/outreach.ts";

test("South African and international numbers normalize without URL injection", () => {
  assert.equal(normalizeWhatsAppPhone("072 123 4567"), "27721234567");
  assert.equal(normalizeWhatsAppPhone("+27 (72) 123-4567"), "27721234567");
  assert.equal(normalizeWhatsAppPhone("0044 7700 900123"), "447700900123");
  for (const value of ["", "000", "+27000?text=hello", "javascript:12345678", "abc123456789"]) assert.equal(normalizeWhatsAppPhone(value), null);
});
test("unconfirmed and suppressed prospects cannot prepare a handoff", () => {
  for (const permission of ["unconfirmed", "do_not_contact"]) assert.equal(canPrepareWhatsApp(permission, "Confirmed permission on the telephone"), false);
  assert.equal(canPrepareWhatsApp("opted_in", ""), false);
  assert.equal(canPrepareWhatsApp("existing_customer", "too short"), false);
  assert.equal(canPrepareWhatsApp("opted_in", "Permission given directly on 16 October"), true);
});
test("draft is personal, illustrative and gives an opt-out", () => {
  const draft = createWhatsAppDraft("Example business", "beauty", "We spoke about appointment requests.");
  assert.match(draft, /Example business/); assert.match(draft, /appointment website/);
  assert.match(draft, /illustrative demo/); assert.match(draft, /won’t follow up/);
  assert.match(draft, /https:\/\/emberweb.co.za\/book/);
  const link = new URL(whatsappDraftUrl("0721234567", draft));
  assert.equal(link.hostname, "wa.me"); assert.equal(link.searchParams.get("text"), draft);
});
test("handoff rejects missing/oversized message and invalid numbers", () => {
  assert.equal(whatsappDraftUrl("0721234567", " "), null);
  assert.equal(whatsappDraftUrl("invalid", "Hello"), null);
  assert.equal(whatsappDraftUrl("0721234567", "a".repeat(2001)), null);
});
test("unknown industries fall back to a generic concept without invented audit findings", () => {
  assert.equal(getIndustry("not-a-real-industry").id, "general");
  assert.match(createWhatsAppDraft("A\nB", "unknown", ""), /Hi A B/);
});

test("dashboard counts only current permitted drafts awaiting review", () => {
  const row = { business_name: "Example", industry: "services", city: "Durban", website: "", phone: "", email: "", notes: "", permission_status: "opted_in", permission_note: "Asked directly for a walkthrough", status: "ready", created_at: "2026-10-17T08:00:00Z", updated_at: "2026-10-17T09:00:00Z" };
  const prospects = [
    { ...row, id: "current" },
    { ...row, id: "stale" },
    { ...row, id: "suppressed", permission_status: "do_not_contact" },
    { ...row, id: "unconfirmed", permission_status: "unconfirmed" },
    { ...row, id: "missing-evidence", permission_note: "" },
    { ...row, id: "replied", status: "replied" },
    { ...row, id: "booked", status: "booked" },
  ];
  const preparations = prospects.map((item) => ({ prospect_id: item.id, message: "Sample draft", prepared_at: row.updated_at, source_updated_at: item.id === "stale" ? row.created_at : row.updated_at }));
  const before = JSON.stringify({ prospects, preparations });
  assert.deepEqual(summarizeOutreach(prospects, preparations), { saved: 7, draftsToReview: 1, replied: 1, booked: 1 });
  assert.equal(JSON.stringify({ prospects, preparations }), before);
});

test("dashboard handles an empty list and does not count orphaned preparations", () => {
  assert.deepEqual(summarizeOutreach([], [{ prospect_id: "missing", message: "Sample", prepared_at: "today", source_updated_at: "today" }]), { saved: 0, draftsToReview: 0, replied: 0, booked: 0 });
});
