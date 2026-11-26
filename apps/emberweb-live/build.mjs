import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderDocument, art } from "./design2.mjs";
import { renderBody } from "./design2-pages.mjs";
import { syncSecurityHeaders } from "./security-headers.mjs";
import { COMPANY } from "./company.mjs";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(appRoot, "dist");
const assetDirectory = path.join(appRoot, "assets");
const imageManifest = JSON.parse(await readFile(path.join(appRoot, "image-manifest.json"), "utf8"));
for (const [source, image] of Object.entries(imageManifest.images)) {
  if (!/^\/(?:brand|visuals)\/[a-z0-9-]+\.png$/.test(source) || !Number.isSafeInteger(image.width) || !Number.isSafeInteger(image.height) || image.width < 1 || image.height < 1) {
    throw new Error("Invalid original image in the generated manifest.");
  }
  for (const output of [...image.variants, image.mainWebp]) {
    if (!/^\/(?:brand|visuals)\/[a-z0-9-]+\.webp$/.test(output.url) || !Number.isSafeInteger(output.width) || !Number.isSafeInteger(output.height) || output.width < 1 || output.height < 1 || output.width > image.width || output.height > image.height) {
      throw new Error("Invalid responsive image in the generated manifest.");
    }
  }
}
const configuredWorkspace = process.env.WORKSPACE_SITE_URL;
const configuredCalendar = process.env.GOOGLE_CALENDAR_BOOKING_URL;
const preview = process.env.VERCEL_ENV === "preview";
const liveLogin = 'href="https://emberweb.co.za/login" rel="noreferrer" aria-label="Customer Login on the live EmberWeb site"';
const linkLiveCustomerLogin = html => preview ? html.replaceAll('href="/login"', liveLogin) : html;
let calendarUrl = null;
if (configuredCalendar && !preview) {
  const url = new URL(configuredCalendar);
  if (url.protocol !== "https:" || url.hostname !== "calendar.google.com" || !/^\/calendar\/appointments\/schedules\/[A-Za-z0-9_-]+$/.test(url.pathname) || url.username || url.password) {
    throw new Error("Use the verified public Google Calendar appointment schedule.");
  }
  calendarUrl = url.href;
}
let workspaceOrigin = null;
if (configuredWorkspace && !preview) {
  const url = new URL(configuredWorkspace);
  if (url.origin !== "https://portal.emberweb.co.za" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error("The public site must connect only to the EmberWeb workspace origin.");
  }
  workspaceOrigin = url.origin;
}

if (!outputDirectory.startsWith(appRoot + path.sep)) {
  throw new Error("Refusing to build outside the EmberWeb app directory.");
}

const pages = [
  { file: "gauteng-workshops.html", path: "/gauteng-workshops", title: "Free Mobile Booking Audit for Gauteng Workshops | EmberWeb", description: "Get a practical review of how drivers find a service and request an appointment on your Gauteng workshop website." },
  { file: "ai-lab.html", path: "/ai-lab", title: "AI Lab | EmberWeb", description: "Explore six interactive examples of AI for business planning, customer enquiries, learning and everyday tasks." },
  { file: "studio.html", path: "/studio", title: "AI development studio | EmberWeb", description: "AI tools, custom apps and websites. Meet the Ember studio and see how we plan, build and support your project." },
  {
    file: "index.html",
    path: "/",
    title: "Web Design, Custom Apps & AI in South Africa | EmberWeb",
    description:
      "EmberWeb designs small business websites, develops custom web apps and builds AI workflow automation for South African businesses.",
  },
  {
    file: "work.html",
    path: "/work",
    title: "Website Design, Web Apps & Automation | EmberWeb",
    description:
      "Explore website design, custom app development and AI automation for South African businesses, including client portals, dashboards and document search.",
  },
  {
    file: "packages.html",
    path: "/packages",
    title: "Website Design Packages & Pricing in South Africa | EmberWeb",
    description:
      "Compare four website design packages for South African small businesses, with once-off build prices and monthly EmberCare fees shown separately.",
  },
  {
    file: "portfolio.html",
    path: "/portfolio",
    title: "Web & App Development Portfolio | EmberWeb",
    description:
      "Explore EmberWeb applications for attendance, operations, asset tracking, forms, learning and mobile experiences. Clear examples of what we can build around your work.",
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
    title: "Websites, apps & AI for your industry | EmberWeb",
    description:
      "Explore websites, client portals, operations apps and AI workflows for local services, professional teams, retail and growing businesses.",
  },
  {
    file: "care.html",
    path: "/care",
    title: "Website Maintenance & Hosting Support | EmberWeb",
    description:
      "Hosting, backups, monitoring, practical improvements and human support to keep your website looked after after launch.",
  },
  {
    file: "start.html",
    path: "/start",
    title: "Start a project | EmberWeb",
    description:
      "Share your website, app or AI workflow idea with EmberWeb. Carry your chosen example into a short brief and arrange a discovery call.",
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

function optimizePageImages(html, pagePath) {
  let heroPrioritized = false;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const original = tag.match(/\bsrc="([^"]+)"/i)?.[1];
    const image = imageManifest.images[original];
    if (!image) return tag;
    const candidates = [...image.variants, image.mainWebp].sort((a, b) => a.width - b.width);
    const srcset = candidates.map(item => `${item.url} ${item.width}w`).join(", ");
    const isBrand = original.startsWith('/brand/');
    const isHero = pagePath === '/' && original === '/visuals/hero-3d.png' && !heroPrioritized;
    if (isHero) heroPrioritized = true;
    const sizes = isBrand ? '32px' : isHero ? '(max-width: 760px) 85vw, 45vw' : '(max-width: 760px) 100vw, 60vw';
    let refined = tag.replace(/\bsrc="[^"]+"/i, `src="${image.mainWebp.url}"`);
    refined = refined.replace(/\s(?:width|height|srcset|sizes|decoding|fetchpriority)="[^"]*"/gi, '');
    if (!isBrand && !isHero) refined = refined.replace(/\sloading="[^"]*"/i, '');
    return refined.replace(/\/?\s*>$/, ` width="${image.width}" height="${image.height}" srcset="${srcset}" sizes="${sizes}" decoding="async"${isHero ? ' fetchpriority="high"' : isBrand ? '' : ' loading="lazy"'}>`);
  });
}

async function preparePage(page) {
  let html = linkLiveCustomerLogin(renderDocument(page, renderBody(page.path, { connected: preview || Boolean(workspaceOrigin), calendarUrl, art })));
  if (preview) html = setMeta(html, "name", "ember-intake-preview", "synthetic");
  if (workspaceOrigin) html = html.replace(/<\/head>/i, '<meta name="ember-workspace-origin" content="' + workspaceOrigin + '"></head>');

  const canonical = COMPANY.website + page.path;
  html = setMeta(html, "name", "description", page.description);
  html = setMeta(html, "name", "robots", preview ? "noindex,nofollow" : "index,follow");
  html = setMeta(html, "name", "theme-color", "#061722");
  html = setMeta(html, "property", "og:type", "website");
  html = setMeta(html, "property", "og:site_name", "EmberWeb");
  html = setMeta(html, "property", "og:title", page.title);
  html = setMeta(html, "property", "og:description", page.description);
  html = setMeta(html, "property", "og:url", canonical);
  const shareImage = {
    "/": "hero-home",
    "/work": "hero-solutions",
    "/portfolio": "hero-portfolio",
    "/gauteng-workshops": "hero-audit",
  }[page.path];
  const shareUrl = COMPANY.website + (shareImage ? `/visuals/library/${shareImage}-768.webp` : "/brand/ember-mark.png");
  html = setMeta(html, "property", "og:image", shareUrl);
  html = setMeta(html, "name", "twitter:card", "summary_large_image");
  html = setMeta(html, "name", "twitter:title", page.title);
  html = setMeta(html, "name", "twitter:description", page.description);
  html = setMeta(html, "name", "twitter:image", shareUrl);
  html = setLink(html, "canonical", canonical);
  html = setLink(html, "icon", "/brand/ember-mark.svg");
  html = setLink(html, "apple-touch-icon", "/brand/ember-mark.png");

  if (page.path === "/") {
    html = setMeta(html, "name", "google-site-verification", "MKeUoDBJJHdUnbTH1YenhZiK6Rd98ZOTLAzP6FuLMW4");
    const organizationId = `${canonical}#organization`;
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": organizationId,
          name: COMPANY.brand,
          alternateName: "Ember Web",
          url: canonical,
          logo: `${COMPANY.website}/brand/ember-mark.png`,
          description: page.description,
          areaServed: { "@type": "Country", name: COMPANY.location },
          telephone: COMPANY.phone,
        },
        {
          "@type": "WebSite",
          "@id": `${canonical}#website`,
          name: COMPANY.brand,
          alternateName: "Ember Web",
          url: canonical,
          inLanguage: "en-ZA",
          publisher: { "@id": organizationId },
        },
      ],
    };
    html = html.replace(/<\/head>/i, '<script type="application/ld+json">' + JSON.stringify(schema) + "</script></head>");
  }
  return optimizePageImages(html, page.path);
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(assetDirectory, outputDirectory, { recursive: true });
await cp(path.join(appRoot, "journeys.js"), path.join(outputDirectory, "journeys.js"));
await cp(path.join(appRoot, "site.js"), path.join(outputDirectory, "site.js"));
await cp(path.join(appRoot, "motion.js"), path.join(outputDirectory, "motion.js"));
await cp(path.join(appRoot, "experience.js"), path.join(outputDirectory, "experience.js"));
await cp(path.join(appRoot, "galaxy.mjs"), path.join(outputDirectory, "galaxy.mjs"));
await cp(path.join(appRoot, "galaxy-boot.js"), path.join(outputDirectory, "galaxy-boot.js"));
await cp(path.join(appRoot, "mission-control.js"), path.join(outputDirectory, "mission-control.js"));
await cp(path.join(appRoot, "robots.txt"), path.join(outputDirectory, "robots.txt"));
await cp(path.join(appRoot, "sitemap.xml"), path.join(outputDirectory, "sitemap.xml"));

for (const page of pages) {
  const html = await preparePage(page);
  await writeFile(path.join(outputDirectory, page.file), html, "utf8");
}

const bookPage = { file: "book.html", path: "/book", title: "Book a discovery call | EmberWeb", description: "Choose a 30-minute Google Meet discovery call for your website, app or AI workflow project." };
await writeFile(path.join(outputDirectory, bookPage.file), await preparePage(bookPage), "utf8");
const notFound = { path: "/404", title: "Page not found | EmberWeb" };
await writeFile(path.join(outputDirectory, "404.html"), linkLiveCustomerLogin(renderDocument(notFound, '<section class="error-page"><div class="container"><p class="eyebrow">Page not found</p><h1>Let’s get you<br>back on track.</h1><p class="lead">This page is no longer here. You can explore our services or start a conversation.</p><a class="button button-primary" href="/">Return to EmberWeb →</a></div></section>')).replace('</head>', '<meta name="robots" content="noindex"></head>'), "utf8");
await syncSecurityHeaders(appRoot, outputDirectory);
process.stdout.write("Built Design 2.0: " + (pages.length + 1) + " EmberWeb pages in " + outputDirectory + "\n");
