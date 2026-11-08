import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../journeys.js", import.meta.url), "utf8");

function createHarness({ search = "", formPresent = true, journeyPresent = true, bookingPresent = false, returnHref = "/start" } = {}) {
  function node(properties = {}) {
    const classes = new Set();
    return {
      dataset: {}, listeners: new Map(), attributes: {}, hidden: false, disabled: false, textContent: "",
      classList: { toggle(name, active) { if (active) classes.add(name); else classes.delete(name); }, contains: (name) => classes.has(name) },
      addEventListener(name, handler) { this.listeners.set(name, handler); },
      getAttribute(name) { return this.attributes[name] ?? null; },
      setAttribute(name, value) { this.attributes[name] = value; },
      ...properties,
    };
  }
  const radios = journeyPresent ? ["startup", "business"].map((value) => node({ value, checked: false, required: true })) : [];
  const fieldsets = ["startup", "business"].map((journeyFields) => node({ dataset: { journeyFields } }));
  const plans = ["default", "startup", "business"].map((journeyPlan) => node({ dataset: { journeyPlan } }));
  const choices = ["startup", "business"].map((journeyChoice) => node({ dataset: { journeyChoice } }));
  const fields = {
    business: node({ value: "My working name", required: true }),
    notes: node({ value: "My idea and original details", placeholder: "" }),
    need: node({ value: "Custom web app" }),
    package: node({ value: "starter" }),
    startup_stage: node({ value: "Exploring" }),
    current_tools: node({ value: "Existing tool details" }),
  };
  const heading = node();
  const intro = node();
  const businessLabel = node();
  const briefLabel = node();
  const bookingGuidance = node({ hidden: true });
  const returnLink = node({ attributes: { href: returnHref } });
  const form = {
    elements: { namedItem: (name) => fields[name] || null },
    querySelectorAll: (selector) => selector === 'input[name="journey"]' ? radios : selector === "[data-journey-fields]" ? fieldsets : [],
  };
  const document = {
    querySelector(selector) {
      if (selector === "form") return formPresent ? form : null;
      if (selector === "#brief-heading") return heading;
      if (selector === "[data-journey-intro]") return intro;
      if (selector === "[data-business-label]") return businessLabel;
      if (selector === "[data-brief-label]") return briefLabel;
      if (selector === "[data-booking-guidance]") return bookingPresent ? bookingGuidance : null;
      if (selector === ".booking-next a") return returnLink;
      return null;
    },
    querySelectorAll: (selector) => selector === "[data-journey-plan]" ? plans : selector === "[data-journey-choice]" ? choices : [],
  };
  vm.runInNewContext(source, { document, window: { location: { search } }, URLSearchParams });
  return {
    radios, fieldsets, plans, choices, fields, heading, intro, businessLabel, briefLabel, bookingGuidance, returnLink,
    choose(value) {
      radios.forEach((radio) => { radio.checked = radio.value === value; });
      radios.find((radio) => radio.checked)?.listeners.get("change")();
    },
  };
}

test("a starting idea gets its own questions and does not require a company name", () => {
  const app = createHarness({ search: "?journey=startup&service=Custom%20web%20app" });
  assert.deepEqual(app.radios.map((radio) => radio.checked), [true, false]);
  assert.deepEqual(app.fieldsets.map((fieldset) => [fieldset.hidden, fieldset.disabled]), [[false, false], [true, true]]);
  assert.equal(app.fields.business.required, false);
  assert.equal(app.businessLabel.textContent, "Project / working name (optional)");
  assert.match(app.heading.textContent, /shape your idea/);
  assert.match(app.briefLabel.textContent, /idea/);
  assert.match(app.fields.notes.placeholder, /customers to book/);
  assert.deepEqual(app.plans.map((plan) => plan.hidden), [true, false, true]);
  assert.equal(app.choices[0].classList.contains("is-selected"), true);
  assert.ok(app.radios.every((radio) => radio.required), "the native path choice remains required");
});

test("an existing business receives improvement questions and requires its business name", () => {
  const app = createHarness({ search: "?journey=business" });
  assert.deepEqual(app.fieldsets.map((fieldset) => [fieldset.hidden, fieldset.disabled]), [[true, true], [false, false]]);
  assert.equal(app.fields.business.required, true);
  assert.equal(app.businessLabel.textContent, "Business name *");
  assert.match(app.heading.textContent, /business work better/);
  assert.match(app.fields.notes.placeholder, /order from WhatsApp/);
  assert.deepEqual(app.plans.map((plan) => plan.hidden), [true, true, false]);
});

test("unknown or missing paths do not assume an existing business or enable unrelated required fields", () => {
  for (const search of ["", "?journey=unknown", "?journey=__proto__", "?journey=toString", "?journey=STARTUP"]) {
    const app = createHarness({ search });
    assert.ok(app.radios.every((radio) => !radio.checked));
    assert.ok(app.fieldsets.every((fieldset) => fieldset.hidden && fieldset.disabled));
    assert.equal(app.fields.business.required, false);
    assert.equal(app.heading.textContent, "Start where you are.");
    assert.deepEqual(app.plans.map((plan) => plan.hidden), [false, true, true]);
  }
});

test("switching paths changes requirements and guidance without erasing any entered context", () => {
  const app = createHarness({ search: "?journey=startup" });
  const before = Object.fromEntries(Object.entries(app.fields).map(([key, field]) => [key, field.value]));
  app.choose("business");
  assert.equal(app.fields.business.required, true);
  assert.equal(app.choices[0].classList.contains("is-selected"), false);
  assert.equal(app.choices[1].classList.contains("is-selected"), true);
  app.choose("startup");
  assert.equal(app.fields.business.required, false);
  assert.deepEqual(Object.fromEntries(Object.entries(app.fields).map(([key, field]) => [key, field.value])), before);
});

test("forms without the path control keep their existing labels and required-company behavior", () => {
  const app = createHarness({ journeyPresent: false, search: "?journey=startup" });
  assert.equal(app.fields.business.required, true);
  assert.equal(app.businessLabel.textContent, "");
  assert.equal(app.fields.notes.placeholder, "");
});

test("booking guidance and the return brief keep only an allowlisted journey", () => {
  for (const journey of ["startup", "business"]) {
    const app = createHarness({ formPresent: false, bookingPresent: true, search: "?journey=" + journey });
    assert.equal(app.bookingGuidance.hidden, false);
    assert.equal(app.returnLink.getAttribute("href"), "/start?journey=" + journey);
    assert.match(app.bookingGuidance.textContent, journey === "startup" ? /do not need a company name/ : /priorities/);
  }
  const unknown = createHarness({ formPresent: false, bookingPresent: true, search: "?journey=__proto__" });
  assert.equal(unknown.bookingGuidance.hidden, true);
  assert.equal(unknown.returnLink.getAttribute("href"), "/start");
});

test("booking context does not overwrite unrelated destinations", () => {
  const app = createHarness({ formPresent: false, bookingPresent: true, search: "?journey=startup", returnHref: "/policies" });
  assert.equal(app.returnLink.getAttribute("href"), "/policies");
});
