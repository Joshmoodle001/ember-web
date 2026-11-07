import test from "node:test";
import assert from "node:assert/strict";
import { createWhatsAppDraft, canPrepareWhatsApp } from "../src/lib/outreach.ts";
import { getOutreachProduct, outreachProducts } from "../src/lib/products.ts";

test("product catalog separates EmberWeb and BioSync and has an explicit legacy default", () => {
  assert.deepEqual(outreachProducts.map((product) => product.id), ["emberweb", "biosync"]);
  assert.equal(getOutreachProduct(undefined).id, "emberweb");
  assert.equal(getOutreachProduct("unknown").id, "emberweb");
  assert.equal(getOutreachProduct("biosync").url, "https://app-biosync.co.za/login");
});

test("BioSync draft proposes a requirements review without inventing business needs or biometric integration", () => {
  const draft = createWhatsAppDraft("Sample team", "retail", "I checked your public team page.", "biosync");
  assert.match(draft, /BioSync Time & Attendance/);
  assert.match(draft, /If attendance reporting/);
  assert.match(draft, /first check your requirements and data sources together/);
  assert.match(draft, /https:\/\/emberweb.co.za\/book/);
  assert.doesNotMatch(draft, /biometric|guarantee|you need|illustrative demo/);
  assert.match(draft, /won’t follow up/);
  assert.equal(canPrepareWhatsApp("unconfirmed", "Published contact on its website"), false);
});

test("legacy drafts retain EmberWeb direction and product switch changes the message", () => {
  const legacy = createWhatsAppDraft("Sample team", "beauty", "");
  assert.equal(legacy, createWhatsAppDraft("Sample team", "beauty", "", "emberweb"));
  assert.match(legacy, /appointment website/);
  assert.doesNotMatch(legacy, /BioSync/);
  assert.notEqual(legacy, createWhatsAppDraft("Sample team", "beauty", "", "biosync"));
});
