import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(appRoot, "dist");
const routes = [
  "index",
  "work",
  "packages",
  "audit",
  "process",
  "industries",
  "care",
  "start",
  "policies",
];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

const siteScript = await readFile(path.join(outputDirectory, "site.js"), "utf8");
new vm.Script(siteScript, { filename: "site.js" });

let localAssetCount = 0;
for (const route of routes) {
  const filename = route + ".html";
  const html = await readFile(path.join(outputDirectory, filename), "utf8");
  assert.match(html, /<h1\b/i, filename + " should have a primary heading");
  assert.match(html, /<title>[^<]+<\/title>/i, filename + " should have a page title");
  assert.match(html, /name="description" content="[^"]+"/i, filename + " should have a description");
  assert.match(html, /rel="canonical" href="https:\/\/emberweb\.co\.za/i, filename + " should have a canonical URL");
  assert.match(html, /_next\/static\/css\/index\.C4tEr32w\.css/i, filename + " should load the copied stylesheet");
  assert.match(html, /src="\/site\.js\?v=/i, filename + " should load the site interactions");
  if (route === "start" || route === "audit") {
    assert.match(html, /<form\s+method="dialog">/i, filename + " must not submit personal details through a GET URL");
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
    if (/\.[a-z0-9]+$/i.test(pathname)) {
      const resolved = path.resolve(outputDirectory, "." + pathname);
      assert.ok(resolved.startsWith(outputDirectory + path.sep), "Link path escaped output: " + href);
      assert.ok(await exists(resolved), filename + " links to a missing file " + href);
    } else {
      const pageFile = path.join(outputDirectory, pathname.slice(1) + ".html");
      assert.ok(await exists(pageFile), filename + " links to an unbuilt route " + href);
    }
  }
}

const css = await readFile(path.join(outputDirectory, "_next", "static", "css", "index.C4tEr32w.css"), "utf8");
assert.ok(css.length > 50000, "Expected the complete live-site stylesheet");
assert.ok(await exists(path.join(outputDirectory, "robots.txt")), "robots.txt should be copied");
assert.ok(await exists(path.join(outputDirectory, "sitemap.xml")), "sitemap.xml should be copied");
const vercelConfig = JSON.parse(await readFile(path.join(appRoot, "vercel.json"), "utf8"));
assert.equal(vercelConfig.buildCommand, "npm run build", "Vercel should run the static-site build");
assert.equal(vercelConfig.outputDirectory, "dist", "Vercel should publish the generated static pages");

process.stdout.write(
  "Validated " + routes.length + " routes, " + localAssetCount + " local asset references, and site.js syntax.\n",
);
