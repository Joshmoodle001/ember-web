import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as safeWebsite from "../src/lib/website-audit.ts";

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(await readFile(new URL("../src/lib/business-crawler.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const compiledModule = { exports: {} };
vm.runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, Buffer, URL, Date, require: (id) => id === "@/lib/website-audit" ? safeWebsite : require(id) });
const { crawlBusinessWebsite, discoverBusinessWebsites } = compiledModule.exports;
const plain = (value) => JSON.parse(JSON.stringify(value));
const checkedAt = "2026-10-18T10:30:00.000Z";
const response = (statusCode, body = "", headers = {}) => ({ statusCode, body: Buffer.from(body), headers });
const robots = (body = "") => response(200, body, { "content-type": "text/plain" });
const html = (body, headers = {}) => response(200, body, { "content-type": "text/html", ...headers });
function harness(responses, extra = {}) {
  const requests = [];
  const queue = [...responses];
  return {
    requests,
    deps: {
      resolveA: async () => ["93.184.216.34"],
      transport: async (url, options) => { requests.push({ url: url.href, options }); const next = queue.shift(); assert.ok(next, `Unexpected request: ${url.href}`); return next; },
      now: () => new Date(checkedAt), ...extra,
    },
  };
}

test("crawler extracts only linked contacts with page provenance and follows at most one contact page", async () => {
  const h = harness([
    robots(), html(`<title>Coastal Studio</title><meta property="og:site_name" content="Coastal"><meta name="viewport" content="width=device-width"><h1>Hello</h1>
      <script><a href="mailto:script@studio.co.za">fake</a></script><template><a href="tel:0825550000">fake</a></template>
      <span>plain@studio.co.za</span><a hidden href="mailto:hidden@studio.co.za">hidden</a>
      <a href="mailto:INFO%40studio.co.za?subject=hello">Mail</a><a href="tel:082-123-4567">Call</a>
      <a href="/contact">Contact</a><a href="/about">About</a><a href="/book">Book now</a>`),
    robots(), html(`<a href="mailto:info@studio.co.za">Duplicate</a><a href="mailto:sales@studio.co.za">Sales</a>
      <a href="tel:0027 (11) 555-1234">Call office</a><a href="/contact/team">Do not follow</a>`),
  ]);
  const result = plain(await crawlBusinessWebsite("https://studio.co.za/about?old=1", h.deps));
  assert.equal(result.businessName, "Coastal");
  assert.equal(result.hasViewport, true);
  assert.equal(result.hasBookingLink, true);
  assert.deepEqual(result.pageUrls, ["https://studio.co.za/", "https://studio.co.za/contact"]);
  assert.deepEqual(result.contacts, [
    { kind: "email", value: "info@studio.co.za", sourceUrl: "https://studio.co.za/", observedAt: checkedAt },
    { kind: "phone", value: "+27821234567", sourceUrl: "https://studio.co.za/", observedAt: checkedAt },
    { kind: "email", value: "sales@studio.co.za", sourceUrl: "https://studio.co.za/contact", observedAt: checkedAt },
    { kind: "phone", value: "+27115551234", sourceUrl: "https://studio.co.za/contact", observedAt: checkedAt },
  ]);
  assert.equal(h.requests.length, 4);
  assert.equal(JSON.stringify(result).includes("<"), false);
});

test("contact values reject header injection, malformed addresses, foreign and invalid telephone values; cap each kind at five", async () => {
  const links = Array.from({ length: 12 }, (_, index) => `<a href="mailto:person${index}@studio.co.za">Mail</a><a href="tel:08212345${String(index).padStart(2, "0")}">Call</a>`).join("");
  const h = harness([robots(), html(`<a href="mailto:bad%0d%0aBcc:attacker@studio.co.za">No</a><a href="mailto:a..b@studio.co.za">No</a>
    <a href="mailto:a@localhost">No</a><a href="mailto:a@studio.co.za,b@studio.co.za">No</a>
    <a href="tel:+15551234567">US</a><a href="tel:+27821234567;ext=123">extension</a><a href="tel:+27+821234567">Invalid</a>${links}`)]);
  const result = await crawlBusinessWebsite("studio.co.za", h.deps);
  assert.equal(result.contacts.filter((contact) => contact.kind === "email").length, 5);
  assert.equal(result.contacts.filter((contact) => contact.kind === "phone").length, 5);
  assert.equal(result.contacts.some((contact) => contact.value.includes("bad") || contact.value.includes("a..b")), false);
});

test("robots is checked for the exact contact path and a denial leaves an explicitly partial homepage result", async () => {
  const h = harness([robots(), html('<a href="/contact">Contact</a><a href="mailto:hello@studio.co.za">Email</a>'), robots("User-agent: *\nDisallow: /contact\n")]);
  const result = await crawlBusinessWebsite("studio.co.za", h.deps);
  assert.deepEqual(plain(result.pageUrls), ["https://studio.co.za/"]);
  assert.equal(result.contacts.length, 1);
  assert.match(result.observations.join(" "), /contact\/about page could not be checked/);
  assert.equal(h.requests.length, 3);
});

test("ignores unsafe, non-contact and off-origin contact links without following them", async () => {
  const h = harness([robots(), html(`<a href="https://other.co.za/contact">Contact</a><a href="/api/contact">Contact</a>
    <a href="/admin/about">About</a><a href="/contact?token=abc">Contact</a><a href="/contact#form">Contact</a>
    <a href="/services">Services</a><a href="http://studio.co.za/about">About</a>`)]);
  const result = await crawlBusinessWebsite("studio.co.za", h.deps);
  assert.equal(result.pageUrls.length, 1);
  assert.equal(h.requests.length, 2);
});

test("DNS public-address enforcement and transport pinning apply to crawler pages", async () => {
  const blocked = harness([], { resolveA: async () => ["93.184.216.34", "10.0.0.1"] });
  await assert.rejects(crawlBusinessWebsite("studio.co.za", blocked.deps), { code: "unsafe_target" });
  assert.equal(blocked.requests.length, 0);
  const h = harness([robots(), html('<a href="/contact">Contact</a>'), robots(), html("Contact")]);
  await crawlBusinessWebsite("studio.co.za", h.deps);
  const options = h.requests[3].options;
  assert.equal(options.path, "/contact");
  assert.equal(options.servername, "studio.co.za");
  assert.equal(options.agent, false);
  assert.equal(options.family, 4);
  assert.equal(options.headers.Authorization, undefined);
  assert.equal(options.headers.Cookie, undefined);
  assert.equal(options.maxBytes, 1024 * 1024);
  const pinned = await new Promise((resolve, reject) => options.lookup("studio.co.za", {}, (error, value) => error ? reject(error) : resolve(value)));
  assert.equal(pinned, "93.184.216.34");
});

test("contact fetch re-resolves and rejects a rebinding private address", async () => {
  let calls = 0;
  const h = harness([robots(), html('<a href="/contact">Contact</a>')], { resolveA: async () => ++calls <= 2 ? ["93.184.216.34"] : ["169.254.169.254"] });
  const result = await crawlBusinessWebsite("studio.co.za", h.deps);
  assert.equal(h.requests.length, 2);
  assert.equal(result.pageUrls.length, 1);
});

test("single hard deadline covers homepage and contact page, including DNS and request waits", async () => {
  let requests = 0;
  let aborted = false;
  const h = harness([], {
    deadlineMs: 20,
    transport: async (_url, options) => {
      requests += 1;
      if (requests === 1 || requests === 3) return robots();
      if (requests === 2) return html('<a href="/contact">Contact</a>');
      return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => { aborted = true; reject(new Error("aborted")); }, { once: true }));
    },
  });
  await assert.rejects(crawlBusinessWebsite("studio.co.za", h.deps), { code: "timeout" });
  assert.equal(aborted, true);
});

test("directory checks the provided path and returns only deduplicated safe outbound website origins", async () => {
  const h = harness([robots(), html(`<a href="https://alpha.co.za/about?a=b">Alpha</a><a href="https://www.alpha.co.za/contact">Duplicate</a>
    <a href="https://beta.co.za/">Beta</a><a href="https://directory.co.za/other">Same source</a>
    <a href="https://facebook.com/alpha">Social</a><a href="https://maps.google.com/">Maps</a>
    <a href="https://www.snupit.co.za/alpha">Listing</a><a href="https://127.0.0.1/">Private</a>
    <a href="http://insecure.co.za/">HTTP</a><a href="https://user:pass@private.co.za/">Credentials</a>
    <a href="https://metadata.google.internal/">Metadata</a><script><a href="https://injected.co.za/">Injected</a></script>`)]);
  const result = plain(await discoverBusinessWebsites("https://directory.co.za/businesses/cape-town", h.deps));
  assert.equal(result.sourceUrl, "https://directory.co.za/businesses/cape-town");
  assert.equal(h.requests[1].options.path, "/businesses/cape-town");
  assert.deepEqual(result.discoveredUrls, ["https://www.alpha.co.za/", "https://beta.co.za/"]);
  assert.equal(h.requests.length, 2, "outbound websites are not fetched by discovery");
});

test("directory discoveries are capped at twenty and robots-denied source is never fetched", async () => {
  const h = harness([robots(), html(Array.from({ length: 30 }, (_, index) => `<a href="https://shop${index}.co.za/">Shop</a>`).join(""))]);
  assert.equal((await discoverBusinessWebsites("https://directory.co.za/list", h.deps)).discoveredUrls.length, 20);
  const denied = harness([robots("User-agent: *\nDisallow: /private\n")]);
  await assert.rejects(discoverBusinessWebsites("https://directory.co.za/private", denied.deps), { code: "robots_denied" });
  assert.equal(denied.requests.length, 1);
});

test("safe page normalizer rejects queries, fragments, encoded route pivots and unsafe paths before DNS", () => {
  assert.equal(safeWebsite.normalizePublicResearchPage("https://directory.co.za/businesses/cape-town"), "https://directory.co.za/businesses/cape-town");
  for (const path of ["/api/list", "/%61dmin/contact", "/auth/start", "/wp-login.php", "/a%2fadmin", "/%2561dmin", "/list?q=1", "/list#x", "/contact%0d%0a"]) {
    assert.throws(() => safeWebsite.normalizePublicResearchPage(`https://directory.co.za${path}`), { code: "unsafe_target" });
  }
});

test("directory canonical redirects retain their path and reject an external or path-changing target", async () => {
  const h = harness([robots(), response(301, "", { location: "https://www.directory.co.za/list/" }), robots(), html('<a href="https://shop.co.za">Shop</a>')]);
  assert.equal((await discoverBusinessWebsites("https://directory.co.za/list", h.deps)).sourceUrl, "https://www.directory.co.za/list/");
  for (const location of ["https://attacker.co.za/list", "/admin", "/other", "http://directory.co.za/list"]) {
    const bad = harness([robots(), response(302, "", { location })]);
    await assert.rejects(discoverBusinessWebsites("https://directory.co.za/list", bad.deps), { code: "unsafe_target" });
    assert.equal(bad.requests.length, 2);
  }
});

test("directory rejects non-HTML, encoded and oversized responses", async () => {
  for (const page of [response(200, "x", { "content-type": "application/json" }), html("x", { "content-encoding": "gzip" }), html("x".repeat(1024 * 1024 + 1))]) {
    const h = harness([robots(), page]);
    await assert.rejects(discoverBusinessWebsites("https://directory.co.za/list", h.deps), safeWebsite.WebsiteAuditError);
  }
});

test("public footer and address text yields emails and explicitly labelled phones, never product numbers or hidden text", async () => {
  const h = harness([robots(), html(`<main><h1>General Dealers</h1><p>Product 0821234567</p><p>catalogue@studio.co.za</p></main>
    <footer><span>INFO@studio.co.za</span><span>Phone: 012 650 0600</span><p>Reference 0821234567</p>
      <p hidden>hidden@studio.co.za Phone: 0821111111</p><p style="display: none">secret@studio.co.za Tel:0822222222</p>
      <p style="visibility:hidden">invisible@studio.co.za</p><p class="d-none">ignored@studio.co.za</p>
      <script>script@studio.co.za Tel:0823333333</script><textarea>form@studio.co.za</textarea><code>sample@studio.co.za</code>
      <noscript>noscript@studio.co.za</noscript></footer><address>Email: office@studio.co.za<br>Call us on +27 (82) 765-4321</address>`)]);
  const result = plain(await crawlBusinessWebsite("studio.co.za", h.deps));
  assert.deepEqual(result.contacts, [
    { kind: "email", value: "info@studio.co.za", sourceUrl: "https://studio.co.za/", observedAt: checkedAt },
    { kind: "phone", value: "+27126500600", sourceUrl: "https://studio.co.za/", observedAt: checkedAt },
    { kind: "email", value: "office@studio.co.za", sourceUrl: "https://studio.co.za/", observedAt: checkedAt },
    { kind: "phone", value: "+27827654321", sourceUrl: "https://studio.co.za/", observedAt: checkedAt },
  ]);
  assert.equal(h.requests.length, 2);
});

test("contact sections and contact-page main text preserve first-source provenance and shared per-kind cap", async () => {
  const moreEmails = Array.from({ length: 8 }, (_, index) => `<p>person${index}@studio.co.za</p>`).join("");
  const h = harness([robots(), html(`<a href="mailto:first@studio.co.za">Mail</a><a href="/contact">Contact</a>
    <section id="contact-us"><p>first@studio.co.za</p><p>hello@studio.co.za</p><h3>Telephone</h3><p>011 555 1234</p></section>`),
    robots(), html(`<main><h2>Phone</h2><p>082 765 4321</p><p>hello@studio.co.za</p>${moreEmails}<p>Stock item 0821234567</p></main>`)]);
  const result = plain(await crawlBusinessWebsite("studio.co.za", h.deps));
  const emails = result.contacts.filter((contact) => contact.kind === "email");
  assert.equal(emails.length, 5);
  assert.equal(emails[0].value, "first@studio.co.za");
  assert.equal(emails[1].value, "hello@studio.co.za");
  assert.equal(emails[1].sourceUrl, "https://studio.co.za/");
  assert.equal(emails[2].sourceUrl, "https://studio.co.za/contact");
  assert.deepEqual(result.contacts.filter((contact) => contact.kind === "phone").map((contact) => contact.value), ["+27115551234", "+27827654321"]);
});

test("an explicit call heading may contain the company name and parenthesized number before its address", async () => {
  const h = harness([robots(), html(`<div id="contact"><h3>CALL GENERAL DEALERS TODAY (012) 651 3255<br>12 High Street, Pretoria</h3>
    <p>Product ID 0821234567</p></div><main><h3>CALL OUTSIDE CONTACT REGION 0829999999</h3></main>`)]);
  const result = plain(await crawlBusinessWebsite("studio.co.za", h.deps));
  assert.deepEqual(result.contacts, [{ kind: "phone", value: "+27126513255", sourceUrl: "https://studio.co.za/", observedAt: checkedAt }]);
});

test("business research accepts HTML above 256KiB but enforces 1MiB; legacy audit retains its 256KiB cap", async () => {
  const body = `<html><body><p>${"x".repeat(300 * 1024)}</p><footer>info@studio.co.za Phone: 0126500600</footer></body></html>`;
  const business = harness([robots(), html(body)]);
  assert.equal((await crawlBusinessWebsite("studio.co.za", business.deps)).contacts.length, 2);
  assert.equal(business.requests[1].options.maxBytes, 1024 * 1024);
  assert.equal(business.requests[0].options.maxBytes, 64 * 1024);
  const legacy = harness([robots(), html(body)]);
  await assert.rejects(safeWebsite.auditWebsite("studio.co.za", legacy.deps), { code: "too_large" });
  assert.equal(legacy.requests[1].options.maxBytes, 256 * 1024);
  const tooBig = harness([robots(), html("x".repeat(1024 * 1024 + 1))]);
  await assert.rejects(crawlBusinessWebsite("studio.co.za", tooBig.deps), { code: "too_large" });
});

test("plaintext extraction remains bounded and never completes a truncated email token", async () => {
  const footer = `<footer>${" ".repeat(2)}${"word ".repeat(1637)}info@studio.co.za</footer>`;
  const h = harness([robots(), html(footer)]);
  const result = await crawlBusinessWebsite("studio.co.za", h.deps);
  assert.equal(result.contacts.length, 0);
});
