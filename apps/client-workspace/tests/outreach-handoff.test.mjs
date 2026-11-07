import test from "node:test";
import assert from "node:assert/strict";
import { filterOutreachProspects, getWhatsAppHandoff } from "../src/lib/outreach.ts";

function prospect(overrides = {}) {
  return {
    id: "saved-business", product_key: "emberweb", business_name: "North Street Services", industry: "services", city: "Durban",
    website: "", phone: "+27 (72) 123-4567", email: "", notes: "", permission_status: "opted_in",
    permission_note: "The owner requested a WhatsApp walkthrough on 21 October.", status: "ready",
    created_at: "2026-10-21T08:00:00Z", updated_at: "2026-10-21T08:00:00Z", ...overrides,
  };
}

function assertBlocked(result, reason) {
  assert.equal(result.appUrl, null);
  assert.equal(result.webUrl, null);
  assert.match(result.reason, reason);
}

test("do-not-contact takes priority over all other handoff state", () => {
  assertBlocked(getWhatsAppHandoff(prospect({ permission_status: "do_not_contact" }), true, false, true, ""), /do not contact/i);
});

test("handoff requires a saved record and saved contact details before review can enable it", () => {
  assertBlocked(getWhatsAppHandoff(undefined, false, true, false, "Hello"), /saved prospect/i);
  assertBlocked(getWhatsAppHandoff(prospect(), true, true, false, "Hello"), /save the business details/i);
  assertBlocked(getWhatsAppHandoff(prospect(), false, true, true, "Hello"), /current save or import/i);
});

test("the saved permission and its evidence remain authoritative", () => {
  for (const saved of [
    prospect({ permission_status: "unconfirmed" }),
    prospect({ permission_status: "opted_in", permission_note: "" }),
    prospect({ permission_status: "existing_customer", permission_note: "too short" }),
  ]) assertBlocked(getWhatsAppHandoff(saved, false, true, false, "Hello"), /contact permission/i);
  const locallyChanged = prospect({ permission_status: "opted_in", permission_note: "Typed locally without saving permission" });
  assertBlocked(getWhatsAppHandoff(locallyChanged, true, true, false, "Hello"), /save the business details/i);
});

test("a current review is required independently of valid saved contact permission", () => {
  assertBlocked(getWhatsAppHandoff(prospect(), false, false, false, "Hello"), /confirm your review/i);
  assert.equal(getWhatsAppHandoff(prospect({ permission_status: "existing_customer" }), false, true, false, "Hello").reason, null);
});

test("phone evidence in notes never becomes a WhatsApp recipient", () => {
  const record = prospect({ phone: "", notes: "Public listing: +27 72 123 4567. WhatsApp ownership unverified." });
  assertBlocked(getWhatsAppHandoff(record, false, true, false, "Hello"), /verify and save a valid WhatsApp number/i);
  for (const phone of ["invalid", "+27721234567?text=unexpected", "javascript:27721234567"]) {
    assertBlocked(getWhatsAppHandoff(prospect({ phone }), false, true, false, "Hello"), /valid WhatsApp number/i);
  }
});

test("handoff validates message bounds and handles malformed Unicode without throwing", () => {
  for (const message of ["", " \n\t", "x".repeat(2001)]) assertBlocked(getWhatsAppHandoff(prospect(), false, true, false, message), /2,000 characters/i);
  assert.equal(getWhatsAppHandoff(prospect(), false, true, false, "x".repeat(2000)).reason, null);
  assertBlocked(getWhatsAppHandoff(prospect(), false, true, false, "Hello \ud800"), /unsupported text/i);
});

test("handoff builds only fixed WhatsApp destinations and preserves the exact reviewed draft", () => {
  const saved = Object.freeze(prospect());
  const message = "Hello 👋\nCould we discuss BioSync? &phone=attacker&send=true # draft";
  const before = JSON.stringify(saved);
  const result = getWhatsAppHandoff(saved, false, true, false, message);
  assert.equal(result.reason, null);
  const app = new URL(result.appUrl);
  const web = new URL(result.webUrl);
  assert.equal(app.origin, "https://wa.me");
  assert.equal(app.pathname, "/27721234567");
  assert.equal(app.searchParams.get("text"), message);
  assert.equal(web.origin, "https://web.whatsapp.com");
  assert.equal(web.pathname, "/send");
  assert.equal(web.searchParams.get("phone"), "27721234567");
  assert.equal(web.searchParams.get("text"), message);
  assert.deepEqual([...web.searchParams.keys()], ["phone", "text"]);
  assert.equal(app.hash, "");
  assert.equal(web.hash, "");
  assert.equal(JSON.stringify(saved), before);
});

test("prospect filtering prioritizes missing websites stably without modifying records or the input array", () => {
  const records = Object.freeze([
    Object.freeze(prospect({ id: "has-one", website: "https://first-business.co.za/" })),
    Object.freeze(prospect({ id: "missing-one", website: "" })),
    Object.freeze(prospect({ id: "has-two", website: "https://second-business.co.za/" })),
    Object.freeze(prospect({ id: "missing-two", website: "  " })),
  ]);
  const before = JSON.stringify(records);
  assert.deepEqual(filterOutreachProspects(records, "", false).map((row) => row.id), ["missing-one", "missing-two", "has-one", "has-two"]);
  assert.deepEqual(filterOutreachProspects(records, "", true).map((row) => row.id), ["missing-one", "missing-two"]);
  assert.equal(JSON.stringify(records), before);
});

test("prospect search uses names, city and saved phone formats including local and international equivalents", () => {
  const records = [prospect({ id: "matching" }), prospect({ id: "other", business_name: "Lakeside Studio", city: "Cape Town", phone: "+44 7700 900123", website: "https://lakeside-business.co.za/" })];
  for (const query of [" north STREET ", "DURBAN", "072", "072 123 4567", "+27 (72) 123-4567", "0027 72 123 4567", "721234"]) {
    assert.deepEqual(filterOutreachProspects(records, query, false).map((row) => row.id), ["matching"], query);
  }
  assert.deepEqual(filterOutreachProspects(records, "0044 7700 900123", false).map((row) => row.id), ["other"]);
  assert.deepEqual(filterOutreachProspects(records, "Cape Town", true), []);
});

test("search never discovers contact numbers or names from research notes, email or website fields", () => {
  const records = [prospect({ notes: "Unverified listing: Hidden Trading +27 82 555 0100", email: "special@domain.co.za", website: "https://unsearched-business.co.za/" })];
  for (const query of ["Hidden Trading", "0825550100", "27825550100", "special@domain.co.za", "unsearched-business", "+", "No match"]) {
    assert.deepEqual(filterOutreachProspects(records, query, false), [], query);
  }
});
