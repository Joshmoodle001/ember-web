import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { SERVICES } from "../solutions.mjs";
import { renderBody } from "../design2-pages.mjs";

const source = await readFile(new URL("../site.js", import.meta.url), "utf8");

function runSite({ search = "", form = false, brokenTarget = false } = {}) {
  const need = { value: "" };
  const contextNotes = [];
  const panels = ["workflow-leads", "workflow-operations", "workflow-knowledge"].map((id) => ({ id, hidden: false }));
  const buttons = panels.map((panel, index) => ({
    dataset: { workflowTarget: brokenTarget && index === 1 ? "missing-panel" : panel.id },
    attributes: {}, listeners: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
  }));
  const controls = { hidden: true };
  const explorer = {
    querySelector: () => controls,
    querySelectorAll: (selector) => selector === ".workflow-panel" ? panels : buttons,
  };
  const projectForm = { elements: { namedItem: (name) => name === "need" ? need : null }, querySelector: () => null, append() {}, addEventListener() {} };
  const document = {
    querySelector(selector) {
      if (selector === "form") return form ? projectForm : null;
      if (selector === ".brief-intro") return { append: (node) => contextNotes.push(node.textContent) };
      return null;
    },
    querySelectorAll: (selector) => selector === "[data-workflow-explorer]" ? [explorer] : [],
    addEventListener() {},
    createElement: () => ({ setAttribute() {}, textContent: "" }),
  };
  vm.runInNewContext(source, { document, window: { location: { search } }, URLSearchParams, crypto: { randomUUID: () => "stable-submission-id" } });
  return { need: need.value, contextNotes, controls, panels, buttons };
}

test("solution enquiries preserve app, AI and care choices instead of silently becoming new websites", () => {
  const expected = ["New website", "Custom web app", "AI knowledge engine", "Workflow automation", "AI agent task force", "Ongoing care"];
  for (const [index, service] of SERVICES.entries()) {
    const search = "?" + new URLSearchParams({ service: service.service, goal: service.goal });
    const result = runSite({ search, form: true });
    assert.equal(result.need, expected[index], service.service);
    assert.ok(result.contextNotes[0].includes(service.service));
    assert.ok(result.contextNotes[0].includes(service.goal));
  }
});

test("illustrative workflows switch one visible panel and expose the selected button state", () => {
  const { controls, panels, buttons } = runSite();
  assert.equal(controls.hidden, false);
  assert.deepEqual(panels.map((panel) => panel.hidden), [false, true, true]);
  buttons[2].listeners.click();
  assert.deepEqual(panels.map((panel) => panel.hidden), [true, true, false]);
  assert.deepEqual(buttons.map((button) => button.attributes["aria-pressed"]), ["false", "false", "true"]);
});

test("incomplete workflow controls leave all examples readable", () => {
  const { controls, panels } = runSite({ brokenTarget: true });
  assert.equal(controls.hidden, true);
  assert.ok(panels.every((panel) => !panel.hidden));
});

test("new offerings have contextual brief links and matching form choices", () => {
  const html = renderBody("/work", {});
  const form = renderBody("/start", { connected: true });
  for (const service of SERVICES) {
    const links = [...html.matchAll(/href="(\/start\?[^\"]+)"/g)].map((match) => new URL(match[1].replaceAll("&amp;", "&"), "https://emberweb.co.za"));
    assert.ok(links.some((url) => url.searchParams.get("service") === service.service && url.searchParams.get("goal") === service.goal));
  }
  for (const value of ["Custom web app", "AI knowledge engine", "Workflow automation", "AI agent task force", "Ongoing care"]) assert.ok(form.includes(`value="${value}"`));
});
