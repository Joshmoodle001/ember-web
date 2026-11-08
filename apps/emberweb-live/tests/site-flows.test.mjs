import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { renderBody } from "../design2-pages.mjs";

const source = await readFile(new URL("../site.js", import.meta.url), "utf8");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((success, failure) => { resolve = success; reject = failure; });
  return { promise, resolve, reject };
}

function createHarness({ formPresent = true, valid = true, consent = true, journey = null, fieldValues = {}, search = "" } = {}) {
  const documentListeners = new Map();
  const nodes = [];
  const requests = [];
  const requestsPending = [];
  const mediaListeners = [];
  let activeElement = null;
  function element(name) {
    const classes = new Set();
    const node = {
      name, textContent: "", dataset: {}, attributes: {}, listeners: new Map(), children: [],
      disabled: false, hidden: false,
      classList: {
        add: (value) => classes.add(value),
        contains: (value) => classes.has(value),
        toggle(value, state) { if (state) classes.add(value); else classes.delete(value); },
      },
      setAttribute(key, value) { this.attributes[key] = value; },
      getAttribute(key) { return this.attributes[key] ?? null; },
      addEventListener(name, callback) { this.listeners.set(name, callback); },
      querySelectorAll: () => [],
      querySelector: () => null,
      append(node) { this.children.push(node); },
      contains(node) { return node === this || this.children.some((child) => child.contains(node)); },
      focus() { activeElement = this; },
      scrollIntoView() { this.scrolledIntoView = true; },
      insertAdjacentElement(position, node) { this.adjacent = { position, node }; },
    };
    nodes.push(node);
    return node;
  }
  const menuButton = element("menu-toggle");
  menuButton.hidden = true;
  const menuLabel = element("menu-label");
  menuButton.children.push(menuLabel);
  menuButton.querySelectorAll = (selector) => selector === ".sr-only" ? [menuLabel] : [];
  const navigation = element("mobile-navigation");
  const links = [element("solutions-link"), element("customer-login-link")];
  navigation.children.push(...links);
  navigation.querySelectorAll = (selector) => selector === "a" ? links : [];
  const outside = element("main-content");
  const desktopLink = element("desktop-navigation-link");
  const form = element("project-form");
  const values = {
    name: "  Client Name  ", business: "Client Business", email: "client@example.test",
    phone: "", need: "Custom web app", timing: "Next month", notes: "Keep my brief on retry", package: "",
    ...(journey === null ? {} : { journey }),
    ...fieldValues,
  };
  const fields = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, Object.assign(element(name), { value })]));
  fields.need.options = ['Custom web app','Business planning','Workflow automation'].map(value => ({value}));
  fields.contact_consent = Object.assign(element("contact_consent"), { checked: consent, required: true });
  // An already-disabled control must stay disabled after a recoverable submission failure.
  fields.package.disabled = true;
  const submit = Object.assign(element("submit"), { textContent: "Send project request" });
  const controls = [...Object.values(fields), submit];
  controls.namedItem = (name) => fields[name] ?? null;
  form.elements = controls;
  form.querySelector = (selector) => selector === '[type="submit"]' ? submit : null;
  form.reportValidity = () => { form.validityChecks = (form.validityChecks ?? 0) + 1; return valid && fields.contact_consent.checked; };
  const document = {
    get activeElement() { return activeElement; },
    querySelector(selector) {
      if (selector === ".menu-toggle") return menuButton;
      if (selector === "#mobile-navigation") return navigation;
      if (selector === ".site-nav-links a") return desktopLink;
      if (selector === "form") return formPresent ? form : null;
      if (selector === 'meta[name="ember-workspace-origin"]') return { content: "https://portal.emberweb.co.za" };
      return null;
    },
    querySelectorAll: () => [],
    addEventListener: (name, callback) => documentListeners.set(name, callback),
    createElement: (tag) => element(tag),
  };
  const media = { matches: false, addEventListener: (name, callback) => mediaListeners.push(callback) };
  vm.runInNewContext(source, {
    document, window: { location: { search }, matchMedia: () => media }, URLSearchParams,
    crypto: { randomUUID: () => "one-request-id" },
    AbortSignal: { timeout: (milliseconds) => ({ timeoutMilliseconds: milliseconds }) },
    fetch(url, options) {
      requests.push({ url, ...options, payload: JSON.parse(options.body) });
      const pending = deferred();
      requestsPending.push(pending);
      return pending.promise;
    },
  });
  return {
    menuButton, menuLabel, navigation, links, outside, desktopLink, documentListeners, nodes, form, fields, submit,
    requests, requestsPending, controls, media, mediaListeners,
    get activeElement() { return activeElement; },
    get status() { return form.children.find((node) => node.className === "form-note form-status"); },
    click: (node) => node.listeners.get("click")?.(),
    submitForm: () => form.listeners.get("submit")({ preventDefault() {} }),
    respond(index, result, ok = true) { requestsPending[index].resolve({ ok, json: async () => result }); },
  };
}

test("mobile navigation opens accessibly, closes with Escape and returns focus to its toggle", () => {
  const app = createHarness({ formPresent: false });
  assert.equal(app.menuButton.hidden, false);
  assert.equal(app.navigation.inert, true);
  assert.deepEqual(app.links.map((link) => link.tabIndex), [-1, -1]);
  app.click(app.menuButton);
  assert.equal(app.navigation.inert, false);
  assert.equal(app.menuButton.getAttribute("aria-expanded"), "true");
  assert.equal(app.navigation.getAttribute("aria-hidden"), "false");
  assert.deepEqual(app.links.map((link) => link.tabIndex), [0, 0]);
  app.links[1].focus();
  app.documentListeners.get("keydown")({ key: "Escape" });
  assert.equal(app.navigation.inert, true);
  assert.equal(app.navigation.classList.contains("is-open"), false);
  assert.equal(app.menuButton.getAttribute("aria-expanded"), "false");
  assert.equal(app.menuLabel.textContent, "Open navigation");
  assert.equal(app.activeElement, app.menuButton);
});

test("navigation remains open for an inside click and closes after choosing a link or clicking outside", () => {
  const app = createHarness({ formPresent: false });
  app.click(app.menuButton);
  app.documentListeners.get("click")({ target: app.navigation });
  assert.equal(app.navigation.inert, false);
  app.click(app.links[0]);
  assert.equal(app.navigation.inert, true);
  app.click(app.menuButton);
  app.documentListeners.get("click")({ target: app.outside });
  assert.equal(app.navigation.inert, true);
  assert.deepEqual(app.links.map((link) => link.tabIndex), [-1, -1]);
  app.outside.focus();
  app.documentListeners.get("keydown")({ key: "Escape" });
  assert.equal(app.activeElement, app.outside, "Escape must not steal focus from unrelated page content");
});

test("resizing to desktop closes phone navigation, preserves keyboard access and does not reopen when resized back", () => {
  const app = createHarness({ formPresent: false });
  app.click(app.menuButton);
  app.links[1].focus();
  app.mediaListeners.forEach((listener) => listener({ matches: true }));
  assert.equal(app.navigation.inert, true);
  assert.equal(app.menuButton.getAttribute("aria-expanded"), "false");
  assert.equal(app.activeElement, app.desktopLink);
  app.mediaListeners.forEach((listener) => listener({ matches: false }));
  assert.equal(app.navigation.inert, true);
  assert.equal(app.menuButton.getAttribute("aria-expanded"), "false");
  app.click(app.menuButton);
  assert.equal(app.navigation.inert, false, "the phone disclosure remains usable after rotation");
});

test("a pending enquiry blocks duplicate requests and a confirmed save provides the booking next step", async () => {
  const app = createHarness();
  const first = app.submitForm();
  await app.submitForm();
  assert.equal(app.requests.length, 1);
  assert.equal(app.form.getAttribute("aria-busy"), "true");
  assert.ok(app.controls.every((control) => control.disabled));
  assert.equal(app.status.dataset.state, "pending");
  assert.equal(app.requests[0].url, "/api/intake");
  assert.equal(app.requests[0].method, "POST");
  assert.equal(app.requests[0].payload.name, "Client Name");
  assert.ok(app.requests[0].payload.brief.includes("Contact consent: agreed for this request"));
  app.respond(0, { success: true });
  await first;
  assert.equal(app.status.dataset.state, "success");
  assert.equal(app.form.getAttribute("aria-busy"), "false");
  assert.equal(app.form.classList.contains("is-complete"), true);
  assert.equal(app.status.adjacent.node.href, "/book");
  assert.equal(app.activeElement, app.status.adjacent.node);
  assert.ok(app.status.textContent.includes("No payment is due"));
  await app.submitForm();
  assert.equal(app.requests.length, 1, "a saved enquiry cannot accidentally be submitted again");
});

test("a rejected enquiry preserves entered values and original disabled states, then retries with the same submission ID", async () => {
  const app = createHarness();
  const originalValues = Object.fromEntries(Object.entries(app.fields).map(([key, field]) => [key, field.value]));
  const originalDisabled = app.controls.map((control) => control.disabled);
  const first = app.submitForm();
  app.respond(0, { error: "Please retry in a moment." }, false);
  await first;
  assert.equal(app.status.dataset.state, "error");
  assert.equal(app.status.textContent, "Please retry in a moment.");
  assert.equal(app.activeElement, app.status);
  assert.deepEqual(app.controls.map((control) => control.disabled), originalDisabled);
  assert.deepEqual(Object.fromEntries(Object.entries(app.fields).map(([key, field]) => [key, field.value])), originalValues);
  assert.equal(app.submit.textContent, "Send project request");
  assert.equal(app.form.getAttribute("aria-busy"), "false");
  const retry = app.submitForm();
  assert.equal(app.requests[1].payload.submission_id, app.requests[0].payload.submission_id);
  app.respond(1, { success: true });
  await retry;
  assert.equal(app.status.dataset.state, "success");
});

test("HTTP success without a confirmed save does not display a booking link", async () => {
  const app = createHarness();
  const attempt = app.submitForm();
  app.respond(0, { success: false, error: "Request not saved." });
  await attempt;
  assert.equal(app.status.dataset.state, "error");
  assert.equal(app.status.adjacent, undefined);
  assert.equal(app.form.classList.contains("is-complete"), false);
  assert.equal(app.submit.disabled, false);
});

test("a request timeout honestly reports uncertainty and keeps the enquiry available for retry", async () => {
  const app = createHarness();
  const attempt = app.submitForm();
  const error = new Error("timeout");
  error.name = "TimeoutError";
  app.requestsPending[0].reject(error);
  await attempt;
  assert.equal(app.requests[0].signal.timeoutMilliseconds, 20000);
  assert.equal(app.status.dataset.state, "error");
  assert.match(app.status.textContent, /couldn’t confirm your request/);
  assert.equal(app.status.adjacent, undefined);
  assert.equal(app.submit.disabled, false);
  assert.equal(app.fields.notes.value, "Keep my brief on retry");
});

test("invalid or unconsented enquiries use native validity and never make a request", async () => {
  for (const options of [{ valid: false }, { consent: false }]) {
    const app = createHarness(options);
    await app.submitForm();
    assert.equal(app.form.validityChecks, 1);
    assert.equal(app.requests.length, 0);
    assert.equal(app.submit.disabled, false);
    assert.equal(app.status.dataset.state, undefined);
  }
  for (const route of ["/start", "/audit"]) {
    const html = renderBody(route, { connected: true });
    assert.match(html, /<input\b(?=[^>]*type="checkbox")(?=[^>]*name="contact_consent")(?=[^>]*\brequired\b)[^>]*>/);
  }
});

test("a person starting from scratch can submit without a company or technical choice and keeps the startup booking path", async () => {
  const app = createHarness({
    journey: "startup",
    fieldValues: {
      business: "", need: "Other", startup_stage: "Exploring an idea", audience: "Local households",
      startup_goal: "Work out a useful first step", business_goal: "STALE business outcome", current_tools: "STALE business tools",
      notes: "I want to test a useful product idea and start with a manageable first launch.",
    },
  });
  const pending = app.submitForm();
  assert.equal(app.requests.length, 1);
  const { payload } = app.requests[0];
  assert.equal(payload.company, "", "no invented business name is submitted for an individual");
  assert.equal(payload.service, "other", "an undecided visitor is not silently sold a website or AI service");
  assert.match(payload.brief, /Starting point: Starting something new/);
  assert.match(payload.brief, /Idea stage: Exploring an idea/);
  assert.match(payload.brief, /Intended customers \/ users: Local households/);
  assert.match(payload.brief, /First useful outcome: Work out a useful first step/);
  assert.doesNotMatch(payload.brief, /STALE business/);
  app.respond(0, { success: true });
  await pending;
  assert.equal(app.status.adjacent.node.href, "/book?journey=startup");
  assert.equal(app.status.dataset.state, "success");
});

test("an existing business submits its improvement context without stale startup answers", async () => {
  const app = createHarness({
    journey: "business",
    fieldValues: {
      business: "Established Business", business_goal: "Reduce manual administration", current_tools: "Website, spreadsheet and calendar",
      startup_stage: "STALE idea stage", audience: "STALE intended customers", startup_goal: "STALE first launch",
      need: "Workflow automation",
    },
  });
  const pending = app.submitForm();
  const { payload } = app.requests[0];
  assert.equal(payload.company, "Established Business");
  assert.equal(payload.service, "ai_development");
  assert.match(payload.brief, /Starting point: Existing business/);
  assert.match(payload.brief, /First useful outcome: Reduce manual administration/);
  assert.match(payload.brief, /Existing tools \/ website: Website, spreadsheet and calendar/);
  assert.doesNotMatch(payload.brief, /STALE/);
  assert.doesNotMatch(payload.brief, /Idea stage:|Intended customers \/ users:/);
  app.respond(0, { success: true });
  await pending;
  assert.equal(app.status.adjacent.node.href, "/book?journey=business");
});

test("an unrecognised journey cannot inject a booking destination or serialize unrelated path answers", async () => {
  const app = createHarness({
    journey: "__proto__",
    search: "?journey=%2F%2Funexpected.example",
    fieldValues: { startup_stage: "PRIVATE stale idea", business_goal: "PRIVATE stale business goal", current_tools: "PRIVATE stale tools" },
  });
  const pending = app.submitForm();
  assert.doesNotMatch(app.requests[0].payload.brief, /Starting point:|PRIVATE|unexpected\.example|__proto__/);
  app.respond(0, { success: true });
  await pending;
  assert.equal(app.status.adjacent.node.href, "/book");
});

test("selected package and service remain part of the brief for either client path", async () => {
  for (const journey of ["startup", "business"]) {
    const app = createHarness({
      journey,
      search: "?" + new URLSearchParams({ journey, package: "starter", service: "Custom web app", goal: "Build a focused customer portal" }),
    });
    const pending = app.submitForm();
    const { payload } = app.requests[0];
    assert.match(payload.brief, /Package: starter/);
    assert.match(payload.brief, /Service: Custom web app/);
    assert.match(payload.brief, /Goal: Build a focused customer portal/);
    assert.match(payload.brief, /What is needed: Custom web app/);
    app.respond(0, { success: true });
    await pending;
    assert.equal(app.status.adjacent.node.href, "/book?journey=" + journey);
  }
});

test("an explicit planning service survives AI and workflow keywords in a referral", async () => {
  const app = createHarness({search:"?service=Business%20planning&goal=Plan%20an%20AI%20workflow"});
  const pending = app.submitForm();
  assert.match(app.requests[0].payload.brief, /What is needed: Business planning/);
  app.respond(0,{success:true});
  await pending;
});

test("oversized referral context is bounded and cannot displace consent or the chosen client path", async () => {
  const app = createHarness({
    journey: "startup",
    search: "?" + new URLSearchParams({ goal: "G".repeat(20000), source: "S".repeat(20000), industry: "I".repeat(20000) }),
    fieldValues: { startup_stage: "Exploring", audience: "First customers", startup_goal: "Shape my idea", notes: "Detailed idea. ".repeat(280) },
  });
  const pending = app.submitForm();
  const brief = app.requests[0].payload.brief;
  assert.ok(brief.length <= 5000);
  assert.equal(brief.split("\n")[0], "Contact consent: agreed for this request");
  assert.match(brief, /Starting point: Starting something new/);
  assert.match(brief, /First useful outcome: Shape my idea/);
  for (const label of ["Goal", "Source", "Industry"]) {
    const line = brief.split("\n").find((item) => item.startsWith(label + ": "));
    if (line) assert.ok(line.slice(label.length + 2).length <= 160, label + " must remain bounded");
  }
  assert.doesNotMatch(brief, /G{161}|S{161}|I{161}/);
  app.respond(0, { success: true });
  await pending;
  assert.equal(app.status.adjacent.node.href, "/book?journey=startup");
});
