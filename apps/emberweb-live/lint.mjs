import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(appRoot, "dist");
const expectedWorkspaceConnection = process.env.EXPECT_WORKSPACE_CONNECTION;
assert.ok(
  expectedWorkspaceConnection === undefined || ["connected", "disconnected"].includes(expectedWorkspaceConnection),
  "EXPECT_WORKSPACE_CONNECTION must be connected or disconnected when supplied",
);
const routes = [
  "index",
  "work",
  "portfolio",
  "packages",
  "audit",
  "process",
  "industries",
  "care",
  "start",
  "policies",
];
const routePaths = Object.freeze({
  index: "/",
  work: "/work",
  portfolio: "/portfolio",
  packages: "/packages",
  audit: "/audit",
  process: "/process",
  industries: "/industries",
  care: "/care",
  start: "/start",
  policies: "/policies",
  book: "/book",
  "404": "/404",
});
const imageManifest = JSON.parse(await readFile(path.join(appRoot, "image-manifest.json"), "utf8"));
const responsiveImageWidths = new Map();
for (const image of Object.values(imageManifest.images)) {
  for (const candidate of [...image.variants, image.mainWebp]) {
    assert.ok(!responsiveImageWidths.has(candidate.url), "Image manifest contains a duplicate URL: " + candidate.url);
    responsiveImageWidths.set(candidate.url, candidate.width);
  }
}

function attribute(tag, name) {
  const match = tag.match(new RegExp("(?:^|\\s)" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i"));
  return match?.[2] ?? null;
}

function hasAttribute(tag, name) {
  return new RegExp("(?:^|\\s)" + name + "(?:\\s|=|/?>)", "i").test(tag);
}

function assertPageStructure(html, filename) {
  assert.equal([...html.matchAll(/<h1\b/gi)].length, 1, filename + " should have exactly one primary heading");

  const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length, filename + " should not repeat an id attribute");

  const mainTags = [...html.matchAll(/<main\b[^>]*>/gi)].map((match) => match[0]);
  assert.equal(mainTags.length, 1, filename + " should use one non-nested main landmark");
  assert.equal(mainTags.filter((tag) => attribute(tag, "id") === "main-content").length, 1, filename + " should expose one main-content target");
  const skipLinks = [...html.matchAll(/<a\b[^>]*>/gi)].map((match) => match[0]);
  assert.ok(skipLinks.some((tag) => attribute(tag, "href") === "#main-content"), filename + " should link its skip link to main-content");

  for (const tag of [...html.matchAll(/<[a-z][^>]*>/gi)].map((match) => match[0])) {
    for (const name of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
      const references = attribute(tag, name);
      if (!references) continue;
      for (const id of references.trim().split(/\s+/)) {
        assert.ok(uniqueIds.has(id), filename + " has an unresolved " + name + " reference: " + id);
      }
    }
  }

  for (const image of [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0])) {
    assert.ok(hasAttribute(image, "alt"), filename + " images should declare alternative text, including empty text for decoration");
  }
}

async function assertResponsiveImages(html, filename) {
  const srcsets = [...html.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const srcset of srcsets) {
    const candidates = srcset.split(",").map((candidate) => candidate.trim());
    assert.ok(candidates.length >= 2, filename + " should provide more than one responsive image width");
    let previousWidth = 0;
    for (const candidate of candidates) {
      const match = candidate.match(/^(\S+)\s+(\d+)w$/);
      assert.ok(match, filename + " has an invalid srcset candidate: " + candidate);
      const [, url, widthText] = match;
      const width = Number(widthText);
      assert.ok(Number.isSafeInteger(width) && width > previousWidth, filename + " srcset widths should be positive and strictly increasing");
      previousWidth = width;
      assert.equal(responsiveImageWidths.get(url), width, filename + " srcset width should match the generated image manifest: " + url);
      const pathname = decodeURIComponent(url.split(/[?#]/)[0]);
      assert.ok(pathname.startsWith("/") && !pathname.startsWith("//"), filename + " srcset should use a local asset path: " + url);
      const resolved = path.resolve(outputDirectory, "." + pathname);
      assert.ok(resolved.startsWith(outputDirectory + path.sep), "srcset path escaped output: " + url);
      assert.ok(await exists(resolved), filename + " srcset references a missing asset " + url);
    }
  }
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertInquiryContract(html, filename, kind, connected) {
  const forms = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)];
  assert.equal(forms.length, 1, filename + " should expose one primary inquiry form");
  const [, formAttributes, formBody] = forms[0];
  const formTag = "<form" + formAttributes + ">";
  assert.match(formTag, /\bmethod=["']dialog["']/i, filename + " must not submit personal details through a GET URL");
  assert.ok(attribute(formTag, "aria-label") || attribute(formTag, "aria-labelledby"), filename + " form should have an accessible name");
  const action = attribute(formTag, "action");
  assert.ok(!action || action.startsWith("/"), filename + " form must not submit to an external URL");

  const controls = [...formBody.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)].map((match) => match[0]);
  const names = controls.map((tag) => attribute(tag, "name")).filter(Boolean);
  const expectedNames = kind === "start"
    ? ["journey", "startup_stage", "audience", "startup_goal", "business_goal", "current_tools", "name", "business", "email", "phone", "need", "timing", "notes", "package"]
    : ["focus", "name", "business", "website", "email", "notes", "package"];
  for (const name of expectedNames) {
    assert.ok(names.includes(name), filename + " is missing the " + name + " intake field");
  }
  const requiredNames = kind === "start"
    ? ["journey", "name", "email", "timing", "notes"]
    : ["focus", "name", "business", "email", "notes"];
  for (const name of requiredNames) {
    const control = controls.find((tag) => attribute(tag, "name") === name);
    assert.ok(control && hasAttribute(control, "required"), filename + " should require " + name);
  }
  if (kind === "start") {
    const business = controls.find((tag) => attribute(tag, "name") === "business");
    assert.ok(!hasAttribute(business, "required"), "A new idea must not require an existing business name");
    const choices = controls.filter((tag) => attribute(tag, "name") === "journey");
    assert.deepEqual(choices.map((tag) => attribute(tag, "value")), ["startup", "business"], "The enquiry must offer the two explicit starting points");
    assert.ok(choices.every((tag) => attribute(tag, "type") === "radio" && hasAttribute(tag, "required")), "Journey choices must be accessible required radio controls");
    assert.match(formBody, /data-journey-fields="startup"[^>]*hidden[^>]*disabled/, "Startup-only fields must be disabled until that path is selected");
    assert.match(formBody, /data-journey-fields="business"[^>]*hidden[^>]*disabled/, "Business-only fields must be disabled until that path is selected");
    assert.match(formBody, /value="Other" selected>Help me work out the first step/, "Visitors must be able to enquire without choosing a technology");
  }

  const packageField = controls.find((tag) => attribute(tag, "name") === "package");
  assert.equal(attribute(packageField, "type"), "hidden", filename + " should keep package context in a hidden field");
  const notesTag = controls.find((tag) => /^<textarea\b/i.test(tag) && attribute(tag, "name") === "notes");
  assert.ok(notesTag, filename + " should include project notes");
  assert.equal(attribute(notesTag, "minlength"), "20", filename + " should enforce the explained 20-character notes minimum");
  assert.ok(hasAttribute(notesTag, "required"), filename + " notes should be required");
  const helperIds = (attribute(notesTag, "aria-describedby") ?? "").split(/\s+/).filter(Boolean);
  assert.ok(helperIds.length > 0, filename + " notes should reference their helper text");
  for (const id of helperIds) {
    assert.ok(html.includes('id="' + id + '"'), filename + " notes helper reference should resolve");
  }
  assert.match(html, /At least 20 characters/i, filename + " should explain the notes minimum");

  const consent = controls.find((tag) => attribute(tag, "name") === "contact_consent");
  if (connected) {
    assert.ok(consent, filename + " connected intake should require explicit contact consent");
    assert.equal(attribute(consent, "type"), "checkbox", filename + " contact consent should be a checkbox");
    assert.ok(hasAttribute(consent, "required"), filename + " connected intake consent should be required");
  } else {
    assert.equal(consent, undefined, filename + " disconnected intake should not present the API-only consent control");
  }

  if (kind === "audit") {
    const website = controls.find((tag) => attribute(tag, "name") === "website");
    assert.ok(website && hasAttribute(website, "required"), "The default website-audit selection should require a URL before submission");
    assert.match(formBody, /<option[^>]*value=["']Website audit["'][^>]*selected/i, "The audit form should default to website audit");
    assert.match(formBody, /optional for an automation audit/i, "Audit should explain when a website URL is optional");
  }
}

function assertPublicLinkSafety(html, filename) {
  const anchors = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)];
  for (const anchor of anchors) {
    const href = anchor[1];
    const tag = anchor[0];
    const destination = new URL(href, "https://emberweb.co.za");
    assert.notEqual(destination.protocol, "javascript:", filename + " must not contain executable link destinations");
    if (destination.origin === "https://emberweb.co.za") {
      const pathname = decodeURIComponent(destination.pathname);
      assert.doesNotMatch(pathname, /^\/(?:admin|api\/admin|finance|invoice|checkout|payfast)(?:\/|$)/i, filename + " must not expose a private finance or public checkout route");
    }
    assert.notEqual(destination.origin, "https://portal.emberweb.co.za", filename + " must not link visitors into the private workspace");
    assert.ok(!/(^|\.)payfast\.co\.za$/i.test(destination.hostname), filename + " must not link to public payment checkout");

    if (/\btarget=["']_blank["']/i.test(tag)) {
      const rel = attribute(tag, "rel") ?? "";
      assert.match(rel, /\bnoopener\b/i, filename + " new-tab links must prevent opener access");
      assert.match(rel, /\bnoreferrer\b/i, filename + " new-tab links must not send a referrer");
    }
  }
}

function assertPublicPricing(html) {
  const cards = [...html.matchAll(/<article\b[^>]*class=["'][^"']*\bpackage-card\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)].map((match) => match[1]);
  const expectedPlans = [
    { name: "Launch Lite", launch: "R1,500", care: "R799" },
    { name: "Starter", launch: "R2,500", care: "R999" },
    { name: "Business", launch: "R4,000", care: "R1,250" },
    { name: "Growth", launch: "From R6,000", care: "R1,500" },
  ];
  assert.equal(cards.length, expectedPlans.length, "The public pricing page should show all four packages");
  for (const plan of expectedPlans) {
    const card = cards.find((content) => content.includes("<h3>" + plan.name + "</h3>"));
    assert.ok(card, "The public pricing page should include the " + plan.name + " package");
    assert.ok(card.includes("<span>Once-off launch</span><strong>" + plan.launch + "</strong>"), plan.name + " should show the confirmed once-off launch price");
    assert.ok(card.includes("<span>EmberCare · monthly</span><strong>" + plan.care + "<small> / month</small></strong>"), plan.name + " should show the confirmed monthly care price");
  }
  assert.match(html, /private invoice link/i, "Pricing should explain that payment follows an agreed proposal");
  assert.match(html, /No surprise checkout/i, "Pricing should make clear that there is no immediate public checkout");
}

const siteScript = await readFile(path.join(outputDirectory, "site.js"), "utf8");
new vm.Script(siteScript, { filename: "site.js" });
assert.match(siteScript, /crypto\.randomUUID\(\)/, "A form submission should reuse a stable idempotency identifier across retries");
assert.match(siteScript, /submission_id\s*:\s*submissionId/, "The intake bridge should send its idempotency identifier");
assert.match(siteScript, /fetch\(["']\/api\/intake["']\s*,\s*\{\s*method:\s*["']POST["']/s, "Connected inquiries should use the same-origin POST bridge");
assert.match(siteScript, /company\s*:\s*field\(["']business["']\)/, "The public business field should map to the workspace company field");
assert.match(siteScript, /brief\s*:\s*lines\.slice\(1\)\.join\(["']\\n["']\)/, "The intake bridge should preserve the customer's brief and context");
assert.match(siteScript, /next\.href\s*=\s*journey\s*\?\s*["']\/book\?journey=/, "A saved inquiry should preserve its validated starting point into booking");
const journeyScript = await readFile(path.join(outputDirectory, "journeys.js"), "utf8");
new vm.Script(journeyScript, { filename: "journeys.js" });
assert.match(siteScript, /website\.required\s*=\s*required/, "Audit website requirement should follow the selected audit type");
assert.match(siteScript, /auditFocus\.value\s*===\s*["']Website audit["']/, "Only website audits should require a website URL");
const motionScript = await readFile(path.join(outputDirectory, "motion.js"), "utf8");
new vm.Script(motionScript, { filename: "motion.js" });
const motionCss = await readFile(path.join(outputDirectory, "motion.css"), "utf8");
assert.match(motionCss, /html\.motion-enabled/i, "Ambient motion should run only when the controller enables it");
assert.match(motionCss, /html\.motion-paused/i, "The motion preference should pause CSS motion");
assert.match(motionCss, /prefers-reduced-motion:\s*reduce/i, "The motion stylesheet should respect reduced-motion preferences");
assert.match(motionCss, /\.hero-orbits/i, "The hero should retain its decorative orbit treatment");
assert.match(motionCss, /\.journey-sigil/i, "The journey steps should retain their decorative sigils");
assert.match(motionCss, /\.motion-toggle\[hidden\]/i, "The motion control should stay hidden until initialized");
assert.doesNotMatch(motionCss, /\[data-motion[^\]]*\][^{]*\{[^}]*opacity\s*:\s*0/is, "Reveal content must stay visible when motion JavaScript or observers are unavailable");

const designCss = await readFile(path.join(outputDirectory, "design2.css"), "utf8");
assert.match(designCss, /--ink\s*:/i, "The new design stylesheet should define its ink color token");
assert.match(designCss, /--paper\s*:/i, "The new design stylesheet should define its paper color token");
assert.match(designCss, /--lime\s*:/i, "The new design stylesheet should define its accent color token");
assert.match(designCss, /:focus-visible/i, "The new design stylesheet should preserve keyboard focus visibility");
assert.match(designCss, /@media\s*\(max-width\s*:\s*760px\)/i, "The new design stylesheet should include a phone layout");
assert.match(designCss, /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/i, "The new design stylesheet should reduce interactions for reduced-motion users");
const formControlRule = designCss.match(/\.form-section\s+input\s*,\s*\.form-section\s+select\s*,\s*\.form-section\s+textarea\s*\{([^}]*)\}/i);
assert.ok(formControlRule, "The redesign should define a shared form-control rule");
assert.match(formControlRule[1], /font-size\s*:\s*16px/i, "The redesign should keep form controls readable on phones");
assert.match(designCss, /@font-face\s*\{[^}]*font-family\s*:\s*Space/i, "The design system should load the supplied Space font");
assert.match(designCss, /@font-face\s*\{[^}]*font-family\s*:\s*Mono/i, "The design system should load the supplied Mono font");
assert.match(designCss, /\.hero\s*\{[^}]*overflow\s*:\s*clip/i, "Hero art should not create a focus-trapping scroll container");
const designFontUrls = [...designCss.matchAll(/url\(['"]?(\/fonts\/[^)'"\s]+\.woff2)['"]?\)/gi)].map((match) => match[1]);
assert.ok(designFontUrls.length >= 2, "The design stylesheet should reference local font assets");
for (const reference of new Set(designFontUrls)) {
  const resolved = path.resolve(outputDirectory, "." + reference);
  assert.ok(resolved.startsWith(outputDirectory + path.sep), "Design font path escaped output: " + reference);
  assert.ok(await exists(resolved), "Design stylesheet references a missing font " + reference);
}
assert.doesNotMatch(designCss, /C:\\Users\\|file:\/\//i, "The design stylesheet must not expose local machine paths");

let localAssetCount = 0;
let responsiveImageCandidateCount = 0;
for (const route of routes) {
  const filename = route + ".html";
  const html = await readFile(path.join(outputDirectory, filename), "utf8");
  const workspaceConnected = /<meta\b[^>]*name="ember-workspace-origin"[^>]*content="https:\/\/portal\.emberweb\.co\.za"/i.test(html);
  if (expectedWorkspaceConnection === "connected") {
    assert.ok(workspaceConnected, filename + " should include the configured workspace handoff");
  } else if (expectedWorkspaceConnection === "disconnected") {
    assert.equal(workspaceConnected, false, filename + " should not include the workspace handoff");
  }
  assertPageStructure(html, filename);
  assert.match(html, /<title>[^<]+<\/title>/i, filename + " should have a page title");
  assert.match(html, /name="description" content="[^"]+"/i, filename + " should have a description");
  const canonicalHref = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
  assert.equal(canonicalHref, "https://emberweb.co.za" + routePaths[route], filename + " should use its exact canonical route URL");
  assert.match(html, /href="\/design2\.css\?v=[^"]+"/i, filename + " should load the maintained Design 2 stylesheet");
  assert.doesNotMatch(html, /href="\/_next\/static\/css\//i, filename + " should not load captured snapshot CSS");
  assert.doesNotMatch(html, /href="\/refinements\.css/i, filename + " should not layer the old refinement stylesheet onto the redesign");
  assert.match(html, /href="\/motion\.css\?v=[^"]+"/i, filename + " should load the progressive motion stylesheet");
  assert.match(html, /src="\/site\.js\?v=/i, filename + " should load the site interactions");
  assert.match(html, /src="\/journeys\.js\?v=/i, filename + " should load the client-path controller");
  assert.match(html, /src="\/motion\.js\?v=/i, filename + " should load the motion controller");
  await assertResponsiveImages(html, filename);
  responsiveImageCandidateCount += [...html.matchAll(/\bsrcset\s*=/gi)].length;
  if (route === "index") {
    const heroActions = html.match(/<div class="hero-actions">([\s\S]*?)<\/div>/i)?.[1] ?? "";
    assert.match(heroActions, /href="\/start"[^>]*>\s*Start a project/i, "The home hero should offer a clear project-request action");
    assert.match(heroActions, /href="\/book"[^>]*>\s*Book a discovery call/i, "The home hero should offer a clear booking action");
    const motionToggle = html.match(/<button\b[^>]*class="[^"]*\bmotion-toggle\b[^"]*"[^>]*>[\s\S]*?<\/button>/i)?.[0];
    assert.ok(motionToggle, "The home page should expose a motion preference control");
    assert.equal(attribute(motionToggle, "type"), "button", "The motion toggle must not submit a form");
    assert.ok(hasAttribute(motionToggle, "aria-pressed"), "The motion toggle should expose its state to assistive technology");
    assert.match(motionToggle, /\bhidden\b/i, "The motion toggle should be hidden until its state is initialized");
    assert.ok(attribute(motionToggle, "aria-label") || motionToggle.replace(/<[^>]+>/g, "").trim(), "The motion toggle should have an accessible name");
    const heroArt = html.match(/<svg\b[^>]*class="[^"]*\bhero-orbits\b[^"]*"[^>]*>/i)?.[0];
    assert.ok(heroArt, "The orbital hero artwork should be present");
    assert.equal(attribute(heroArt, "aria-hidden"), "true", "Decorative hero artwork should be hidden from assistive technology");
    assert.equal(attribute(heroArt, "focusable"), "false", "Decorative hero artwork should not enter the focus order");
    const sigils = [...html.matchAll(/<svg\b[^>]*class="[^"]*\bjourney-sigil\b[^"]*"[^>]*>/gi)].map((match) => match[0]);
    assert.equal(sigils.length, 3, "Each journey step should have its decorative sigil");
    assert.ok(sigils.every((tag) => attribute(tag, "aria-hidden") === "true" && attribute(tag, "focusable") === "false"), "Journey sigils should be decorative and unfocusable");
  }
  if (route === "start" || route === "audit") {
    assertInquiryContract(html, filename, route, workspaceConnected);
  }
  assert.doesNotMatch(html, /\/_next\/static\/chunks\//i, filename + " should not load the old framework runtime");
  assert.doesNotMatch(html, /C:\/Users\//i, filename + " should not expose a machine-local font path");

  const localReferences = [
    ...html.matchAll(/\b(?:src|poster)\s*=\s*["'](\/[^"']+)["']/gi),
  ].map((match) => match[1].split(/[?#]/)[0]);
  for (const reference of new Set(localReferences)) {
    const resolved = path.resolve(outputDirectory, "." + decodeURIComponent(reference));
    assert.ok(resolved.startsWith(outputDirectory + path.sep), "Asset path escaped output: " + reference);
    assert.ok(await exists(resolved), filename + " references a missing asset " + reference);
    localAssetCount += 1;
  }

  const inlineFontUrls = [...html.matchAll(/url\((\/fonts\/[^)]+\.woff2)\)/gi)].map((match) => match[1]);
  for (const reference of new Set(inlineFontUrls)) {
    const resolved = path.resolve(outputDirectory, "." + decodeURIComponent(reference));
    assert.ok(await exists(resolved), filename + " references a missing font " + reference);
  }

  const localLinks = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["'](\/[^"']*)["']/gi)].map((match) => match[1]);
  for (const href of localLinks) {
    const pathname = decodeURIComponent(href.split(/[?#]/)[0]);
    if (!pathname || pathname === "/") continue;
    if (["/outreach", "/login", "/account"].includes(pathname)) continue;
    if (/\.[a-z0-9]+$/i.test(pathname)) {
      const resolved = path.resolve(outputDirectory, "." + pathname);
      assert.ok(resolved.startsWith(outputDirectory + path.sep), "Link path escaped output: " + href);
      assert.ok(await exists(resolved), filename + " links to a missing file " + href);
    } else {
      const pageFile = path.resolve(outputDirectory, pathname.slice(1) + ".html");
      assert.ok(pageFile.startsWith(outputDirectory + path.sep), "Route link escaped output: " + href);
      assert.ok(await exists(pageFile), filename + " links to an unbuilt route " + href);
    }
  }
  assertPublicLinkSafety(html, filename);
}

const bookingPage = await readFile(path.join(outputDirectory, "book.html"), "utf8");
assertPageStructure(bookingPage, "book.html");
await assertResponsiveImages(bookingPage, "book.html");
assert.match(bookingPage, /<title>Book a discovery call \| EmberWeb<\/title>/i, "book.html should have a page title");
assert.match(bookingPage, /rel="canonical" href="https:\/\/emberweb\.co\.za\/book"/i, "book.html should have a canonical URL");
const bookingFrame = bookingPage.match(/<iframe\b[^>]*>/i);
if (bookingFrame) {
  const bookingSource = bookingFrame[0].match(/\bsrc="([^"]+)"/i)?.[1];
  assert.ok(bookingSource, "The calendar iframe should have a source URL");
  const calendar = new URL(bookingSource.replaceAll("&amp;", "&"));
  assert.equal(calendar.protocol, "https:", "The booking calendar must use HTTPS");
  assert.equal(calendar.hostname, "calendar.google.com", "The booking calendar must use Google Calendar");
  assert.equal(calendar.searchParams.get("gv"), "true", "The booking calendar must use Google's public guest embed view");
  assert.match(calendar.pathname, /^\/calendar\/appointments\/schedules\/[A-Za-z0-9_-]+$/, "The booking page must embed an appointment schedule");
  assert.match(bookingFrame[0], /\breferrerpolicy="no-referrer"/i, "The calendar embed should not receive a referrer");
  const directCalendarLink = [...bookingPage.matchAll(/<a\b[^>]*href="(https:\/\/calendar\.google\.com\/calendar\/appointments\/schedules\/[A-Za-z0-9_-]+[^" ]*)"[^>]*>/gi)].find((match) => match[1].replaceAll("&amp;", "&") === calendar.href);
  assert.ok(directCalendarLink, "The booking page should offer a direct link to the same calendar schedule");
  assert.match(directCalendarLink[0], /\btarget="_blank"/i, "The direct calendar link should open in a new tab");
  assert.match(directCalendarLink[0], /\brel="noopener noreferrer"/i, "The direct calendar link should protect the opener and referrer");
} else {
  const fallback = bookingPage.match(/<div\b[^>]*class="[^"]*\bbooking-fallback\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
  assert.ok(fallback, "Without a calendar URL, the booking page should render its explicit fallback panel");
  assert.match(fallback, /<h2>[^<]+<\/h2>/i, "The booking fallback should explain the next step with a heading");
  assert.match(fallback, /href="\/start"[^>]*>[^<]*(?:brief|project)/i, "The booking fallback should direct visitors to the project brief");
}
assertPublicLinkSafety(bookingPage, "book.html");
const pricingPage = await readFile(path.join(outputDirectory, "packages.html"), "utf8");
assertPublicPricing(pricingPage);
const notFoundPage = await readFile(path.join(outputDirectory, "404.html"), "utf8");
assertPageStructure(notFoundPage, "404.html");
assert.match(notFoundPage, /name="robots" content="noindex"/i, "The not-found page should stay out of search results");
assertPublicLinkSafety(notFoundPage, "404.html");
assert.ok(await exists(path.join(outputDirectory, "robots.txt")), "robots.txt should be copied");
assert.ok(await exists(path.join(outputDirectory, "sitemap.xml")), "sitemap.xml should be copied");
const vercelConfig = JSON.parse(await readFile(path.join(appRoot, "vercel.json"), "utf8"));
const cspHeader = rule => rule?.headers?.find(header => header.key.toLowerCase() === "content-security-policy")?.value;
const globalHeaders = vercelConfig.headers?.find(rule => rule.source === "/(.*)");
assert.ok(globalHeaders, "The common security header rule must remain present");
assert.equal(cspHeader(globalHeaders), undefined, "CSP must not be global because it would override the proxied workspace app");
const publicDocuments = [...routes, "book", "404"];
for (const route of publicDocuments) {
  const routePath = routePaths[route];
  const matchingRules = (vercelConfig.headers ?? []).filter(rule => rule.source === routePath);
  assert.equal(matchingRules.length, 1, route + " must have one explicit document security-header rule");
  const csp = cspHeader(matchingRules[0]);
  assert.ok(csp, route + " must have an explicit Content Security Policy");
  assert.equal(matchingRules[0].headers.filter(header => header.key.toLowerCase() === "content-security-policy").length, 1, route + " must have exactly one CSP header");
  const scriptDirective = csp.split(";").find(value => value.trim().startsWith("script-src "));
  assert.ok(scriptDirective?.includes("'self'"), route + " scripts must remain same-origin");
  assert.doesNotMatch(scriptDirective, /unsafe-inline|unsafe-eval/, route + " must block executable inline scripts and eval");
  assert.ok(csp.includes("frame-src https://calendar.google.com"), route + " must allow the verified booking frame");
  assert.ok(csp.includes("object-src 'none'") && csp.includes("frame-ancestors 'none'"), route + " must block object embedding and framing");
  assert.ok(csp.includes("connect-src 'self'"), route + " network access must remain same-origin");

  const html = await readFile(path.join(outputDirectory, route + ".html"), "utf8");
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(script[1]) || !script[2].trim()) continue;
    const hash = "'sha256-" + createHash("sha256").update(script[2]).digest("base64") + "'";
    assert.ok(scriptDirective.includes(hash), route + " structured-data script must match its route CSP hash");
  }
}
assert.equal(vercelConfig.buildCommand, "npm run build", "Vercel should run the static-site build");
assert.equal(vercelConfig.outputDirectory, "dist", "Vercel should publish the generated static pages");
const intakeRewrites = (vercelConfig.rewrites ?? []).filter((rewrite) => rewrite.source === "/api/intake");
assert.equal(intakeRewrites.length, 1, "Vercel should define one public intake rewrite");
assert.equal(intakeRewrites[0].destination, "https://portal.emberweb.co.za/api/intake", "Vercel should proxy public intake to the workspace API");
const expectedPortalRewrites = new Map([
  ["/api/account", "https://portal.emberweb.co.za/api/account"],
  ["/account", "https://portal.emberweb.co.za/account"],
  ["/account/:path*", "https://portal.emberweb.co.za/account/:path*"],
  ["/api/account/:path*", "https://portal.emberweb.co.za/api/account/:path*"],
  ["/outreach", "https://portal.emberweb.co.za/admin/outreach"],
  ["/outreach/:path*", "https://portal.emberweb.co.za/outreach/:path*"],
  ["/login", "https://portal.emberweb.co.za/login"],
  ["/setup", "https://portal.emberweb.co.za/setup"],
  ["/admin", "https://portal.emberweb.co.za/admin"],
  ["/admin/:path*", "https://portal.emberweb.co.za/admin/:path*"],
  ["/auth/:path*", "https://portal.emberweb.co.za/auth/:path*"],
  ["/api/admin/:path*", "https://portal.emberweb.co.za/api/admin/:path*"],
  ["/api/auth/:path*", "https://portal.emberweb.co.za/api/auth/:path*"],
  ["/_next/:path*", "https://portal.emberweb.co.za/_next/:path*"],
  ["/demo", "https://portal.emberweb.co.za/demo"],
  ["/demo/:path*", "https://portal.emberweb.co.za/demo/:path*"],
]);
for (const [source, destination] of expectedPortalRewrites) {
  const matches = (vercelConfig.rewrites ?? []).filter(rewrite => rewrite.source === source);
  assert.equal(matches.length, 1, "Vercel should define one portal rewrite for " + source);
  assert.equal(matches[0].destination, destination, "Vercel should proxy " + source + " to the matching workspace route");
}
assert.ok(vercelConfig.rewrites.findIndex(rewrite => rewrite.source === "/admin") < vercelConfig.rewrites.findIndex(rewrite => rewrite.source === "/admin/:path*"), "The exact dashboard rewrite must precede its wildcard to avoid a trailing-slash redirect loop");
assert.match(notFoundPage, /href="\/login"[^>]*>Customer Login<\/a>/i, "Unified Customer Login must remain available on the not-found page");

process.stdout.write(
  "Validated " + publicDocuments.length + " static document CSPs, portal and intake rewrites, " + routes.length + " public routes, Design 2 and motion accessibility, intake and pricing contracts, booking and fallback behavior, " + localAssetCount + " local asset references, " + responsiveImageCandidateCount + " responsive image sets, and site/motion script syntax.\n",
);
