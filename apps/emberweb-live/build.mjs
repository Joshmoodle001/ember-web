import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(appRoot, "dist");
const sourceDirectory = path.join(appRoot, "source");
const assetDirectory = path.join(appRoot, "assets");

if (!outputDirectory.startsWith(appRoot + path.sep)) {
  throw new Error("Refusing to build outside the EmberWeb app directory.");
}

const pages = [
  {
    file: "index.html",
    path: "/",
    title: "Websites with real pull | EmberWeb",
    description:
      "EmberWeb turns good South African businesses into vivid digital experiences that get remembered, trusted and chosen.",
  },
  {
    file: "work.html",
    path: "/work",
    title: "Work and visual direction | EmberWeb",
    description:
      "Explore EmberWeb's experience concepts and visual direction for local trades, hospitality and professional services.",
  },
  {
    file: "packages.html",
    path: "/packages",
    title: "Website packages and pricing | EmberWeb",
    description:
      "Find a clear starting point for your new website, with launch fees and ongoing EmberCare support explained up front.",
  },
  {
    file: "audit.html",
    path: "/audit",
    title: "Free website and automation audit | EmberWeb",
    description:
      "Request a practical, no-pressure review of your website or business automation and get useful next steps.",
  },
  {
    file: "process.html",
    path: "/process",
    title: "How an EmberWeb project works",
    description:
      "See how EmberWeb moves from the first conversation to a clear scope, a thoughtful build and a supported launch.",
  },
  {
    file: "industries.html",
    path: "/industries",
    title: "Websites for South African businesses | EmberWeb",
    description:
      "Digital experiences shaped around how local service, appointment, retail and growing businesses earn trust and enquiries.",
  },
  {
    file: "care.html",
    path: "/care",
    title: "EmberCare website support | EmberWeb",
    description:
      "Hosting, backups, monitoring, practical improvements and human support to keep your website looked after after launch.",
  },
  {
    file: "start.html",
    path: "/start",
    title: "Start a website project | EmberWeb",
    description:
      "Tell EmberWeb what you are building. Share a short project brief and continue the conversation in WhatsApp.",
  },
  {
    file: "policies.html",
    path: "/policies",
    title: "Privacy, ownership and project policies | EmberWeb",
    description:
      "Read EmberWeb's plain-language commitments on privacy, ownership, payments, care and third-party tools.",
  },
];

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function setMeta(html, attribute, key, content) {
  const expression = new RegExp(
    "<meta\\b(?=[^>]*\\b" + attribute + "=[\"']" + escapeRegExp(key) + "[\"'])[^>]*>",
    "i",
  );
  const tag =
    '<meta ' + attribute + '="' + escapeAttribute(key) + '" content="' +
    escapeAttribute(content) + '">';
  if (expression.test(html)) return html.replace(expression, tag);
  return html.replace(/<\/head>/i, tag + "</head>");
}

function setLink(html, rel, href) {
  const expression = new RegExp(
    "<link\\b(?=[^>]*\\brel=[\"']" + escapeRegExp(rel) + "[\"'])[^>]*>",
    "i",
  );
  const tag = '<link rel="' + escapeAttribute(rel) + '" href="' + escapeAttribute(href) + '">';
  if (expression.test(html)) return html.replace(expression, tag);
  return html.replace(/<\/head>/i, tag + "</head>");
}

async function preparePage(page) {
  let html = await readFile(path.join(sourceDirectory, page.file), "utf8");

  // The original pages were server-rendered. Remove their framework payloads so
  // the snapshot works as a self-contained static site without the old backend.
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<link\b(?=[^>]*\bas\s*=\s*["']script["'])[^>]*>/gi, "");
  html = html.replace(/<link\b(?=[^>]*\.js(?:["'?]|$))[^>]*>/gi, "");
  html = html.replace(
    /C:\/Users\/[^/]+\/Documents\/ChatGPT\/[^/]+\/\.vinext\/fonts\/[^/]+\//g,
    "/fonts/",
  );
  html = html.replace(
    /https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/6\/6b\/WhatsApp\.svg/g,
    "/visuals/whatsapp.svg",
  );

  html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, "<title>" + page.title + "</title>");
  html = html.replace(/<html\b([^>]*)>/i, (tag, attributes) => {
    if (/\blang\s*=/.test(attributes)) {
      return "<html" + attributes.replace(/\blang\s*=\s*([\"'])[^\"']*\1/i, ' lang="en-ZA"') + ">";
    }
    return '<html lang="en-ZA"' + attributes + ">";
  });

  const canonical = "https://emberweb.co.za" + page.path;
  html = setMeta(html, "name", "description", page.description);
  html = setMeta(html, "name", "robots", "index,follow");
  html = setMeta(html, "name", "theme-color", "#061722");
  html = setMeta(html, "property", "og:type", "website");
  html = setMeta(html, "property", "og:site_name", "EmberWeb");
  html = setMeta(html, "property", "og:title", page.title);
  html = setMeta(html, "property", "og:description", page.description);
  html = setMeta(html, "property", "og:url", canonical);
  html = setMeta(html, "property", "og:image", "https://emberweb.co.za/brand/emberweb-weave.png");
  html = setMeta(html, "name", "twitter:card", "summary_large_image");
  html = setMeta(html, "name", "twitter:title", page.title);
  html = setMeta(html, "name", "twitter:description", page.description);
  html = setLink(html, "canonical", canonical);
  html = setLink(html, "icon", "/brand/emberweb-weave.png");

  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "EmberWeb",
    url: "https://emberweb.co.za/",
    areaServed: "South Africa",
    email: "info@emberweb.co.za",
    telephone: "+27 72 339 8781",
  };
  html = html.replace(
    /<\/head>/i,
    '<script type="application/ld+json">' + JSON.stringify(schema) + "</script></head>",
  );
  html = html.replace(
    /<\/body>/i,
    '<script src="/site.js?v=20261012" defer></script></body>',
  );
  return html;
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(assetDirectory, outputDirectory, { recursive: true });
await cp(path.join(appRoot, "site.js"), path.join(outputDirectory, "site.js"));
await cp(path.join(appRoot, "robots.txt"), path.join(outputDirectory, "robots.txt"));
await cp(path.join(appRoot, "sitemap.xml"), path.join(outputDirectory, "sitemap.xml"));
await cp(path.join(appRoot, "404.html"), path.join(outputDirectory, "404.html"));

for (const page of pages) {
  const html = await preparePage(page);
  await writeFile(path.join(outputDirectory, page.file), html, "utf8");
}

process.stdout.write("Built " + pages.length + " EmberWeb pages in " + outputDirectory + "\n");
