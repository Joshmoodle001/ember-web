import { loadBuffer } from "cheerio";
import { createBoundedResearchSession, normalizePublicResearchPage, normalizeResearchUrl, WebsiteAuditError, type WebsiteAuditDependencies } from "@/lib/website-audit";

export type BusinessContact = { kind: "email" | "phone"; value: string; sourceUrl: string; observedAt: string };
export type BusinessCrawlEvidence = {
  sourceUrl: string; checkedAt: string; businessName: string; title: string; description: string;
  heading: string; pageUrls: string[]; contacts: BusinessContact[]; observations: string[];
  hasViewport: boolean; hasBookingLink: boolean;
};

function text(value: string | undefined, maximum: number) {
  return (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum);
}

function inertPage(html: Uint8Array) {
  const $ = loadBuffer(Buffer.from(html));
  $("script,style,noscript,template,input,textarea,select,button,code,pre,[hidden],[aria-hidden='true']").remove();
  $("[style],[class]").each((_index, element) => {
    if (/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\b/i.test($(element).attr("style") ?? "")
      || /(?:^|\s)(?:hidden|d-none|sr-only|visually-hidden)(?:\s|$)/i.test($(element).attr("class") ?? "")) $(element).remove();
  });
  return $;
}

function emailValue(raw: string): string | null {
  let candidate: string;
  try { candidate = decodeURIComponent(raw.split("?", 1)[0]).trim().toLowerCase(); } catch { return null; }
  if (candidate.length > 254 || /[\u0000-\u0020\u007f,;]/.test(candidate)) return null;
  const parts = candidate.split("@");
  if (parts.length !== 2 || parts[0].length > 64 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(parts[0])
    || parts[0].startsWith(".") || parts[0].endsWith(".") || parts[0].includes("..")) return null;
  try { normalizeResearchUrl(`https://${parts[1]}/`); } catch { return null; }
  return candidate;
}

function phoneValue(raw: string): string | null {
  let candidate: string;
  try { candidate = decodeURIComponent(raw).trim(); } catch { return null; }
  if (!/^\+?[\d\s().-]{9,40}$/.test(candidate)) return null;
  let digits = candidate.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^0[1-9]\d{8}$/.test(digits)) digits = `27${digits.slice(1)}`;
  return /^27[1-9]\d{8}$/.test(digits) ? `+${digits}` : null;
}

function addContact(kind: BusinessContact["kind"], raw: string, sourceUrl: string, observedAt: string, contacts: BusinessContact[]) {
  if (contacts.filter((contact) => contact.kind === kind).length >= 5) return;
  const value = kind === "email" ? emailValue(raw) : phoneValue(raw);
  if (value && !contacts.some((contact) => contact.kind === kind && contact.value === value)) contacts.push({ kind, value, sourceUrl, observedAt });
}

function collectContacts($: ReturnType<typeof inertPage>, sourceUrl: string, observedAt: string, contacts: BusinessContact[]) {
  $("a[href]").each((_index, anchor) => {
    const href = $(anchor).attr("href")?.trim() ?? "";
    const kind = /^mailto:/i.test(href) ? "email" : /^tel:/i.test(href) ? "phone" : null;
    if (kind) addContact(kind, href.slice(kind === "email" ? 7 : 4), sourceUrl, observedAt, contacts);
  });

  // Contact text is read only from public contact areas, never arbitrary product
  // copy, scripts, forms or examples. Numbers require a telephone/call label.
  const isContactPage = /(?:^|\/)(?:contact(?:-us)?)(?:\.[a-z]{2,5})?\/?$/i.test(new URL(sourceUrl).pathname);
  let inspectedAreas = 0;
  let textBudget = 32 * 1024;
  $("footer,address,[role='contentinfo'],main,section,div[id],div[class]").each((_index, element) => {
    if (inspectedAreas >= 50 || textBudget <= 0) return;
    const tag = element.tagName.toLowerCase();
    const role = $(element).attr("role");
    const identity = `${$(element).attr("id") ?? ""} ${$(element).attr("class") ?? ""}`;
    const publicContactArea = tag === "footer" || tag === "address" || role === "contentinfo"
      || /(?:^|[\s_-])(?:contact|footer)(?:[\s_-]|$)/i.test(identity)
      || (isContactPage && (tag === "main" || tag === "section"));
    if (!publicContactArea) return;
    inspectedAreas += 1;
    const area = $(element).clone();
    area.find("br").replaceWith(" ");
    area.find("p,div,address,section,li,h1,h2,h3,h4,h5,h6,span,a").append(" ");
    const fullContent = text(area.text(), 1024 * 1024);
    const areaBudget = Math.min(8 * 1024, textBudget);
    // Drop a truncated final token rather than inventing a partial address.
    const content = fullContent.length > areaBudget ? fullContent.slice(0, areaBudget).replace(/\S*$/, "") : fullContent;
    textBudget -= content.length;
    const emails = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9.-]+\.[a-z]{2,63}/gi;
    for (const match of content.matchAll(emails)) {
      const before = content[match.index - 1] ?? "";
      const after = content[match.index + match[0].length] ?? "";
      if (/[a-z0-9.!#$%&'*+/=?^_`{|}~@-]/i.test(before) || /[a-z0-9.@-]/i.test(after)) continue;
      addContact("email", match[0], sourceUrl, observedAt, contacts);
    }
    // A call heading may name the business before the number. Keep this broader
    // context restricted to actual headings, rather than arbitrary product text.
    area.find("h1,h2,h3,h4,h5,h6").slice(0, 20).each((_headingIndex, heading) => {
      const headingText = text($(heading).text(), 240);
      if (!headingText || !content.includes(headingText)) return;
      const match = /^(?:call|phone|tel(?:ephone)?|mobile|cell(?:phone)?|whats?app)\b[^\d+]{0,100}((?:\+27|0027)(?:[ \t().-]*\d){9}|\(?0(?:[ \t().-]*\d){9})(?!\d)/i.exec(headingText);
      if (match) addContact("phone", match[1], sourceUrl, observedAt, contacts);
    });
    const phones = /(?:\b(?:tel(?:ephone)?|phone|call(?:\s+us)?|mobile|cell(?:phone)?|whats?app|contact\s+number)|\bT(?=\s*:))(?:\s+(?:number|no\.?|on|at))?\s*[:.=-]?\s*((?:\+27|0027)(?:[ \t().-]*\d){9}|\(?0(?:[ \t().-]*\d){9})(?![ \t().-]*\d)/gi;
    for (const match of content.matchAll(phones)) addContact("phone", match[1], sourceUrl, observedAt, contacts);
  });
}

function contactPage($: ReturnType<typeof inertPage>, sourceUrl: string): string | null {
  const source = new URL(sourceUrl);
  let found: string | null = null;
  $("a[href]").each((_index, anchor) => {
    if (found) return;
    const href = $(anchor).attr("href");
    if (!href) return;
    try {
      const target = new URL(href, source);
      // Follow one public contact/about page, never a search, form action or arbitrary link.
      if (target.origin !== source.origin || target.pathname === "/"
        || !/(?:^|\/)(?:contact(?:-us)?|about(?:-us)?)(?:\.[a-z]{2,5})?\/?$/i.test(target.pathname)) return;
      found = normalizePublicResearchPage(target.href);
    } catch { /* An unsupported link is not a research target. */ }
  });
  return found;
}

function bookingLink($: ReturnType<typeof inertPage>, sourceUrl: string) {
  let found = false;
  $("a[href]").each((_index, anchor) => {
    try {
      const target = new URL($(anchor).attr("href") ?? "", sourceUrl);
      if (target.protocol !== "https:" || target.username || target.password || target.port) return;
      if (target.hostname === "calendar.google.com" && /^\/calendar\/appointments\/schedules\/[a-z0-9_-]+$/i.test(target.pathname)) { found = true; return; }
      if (target.origin !== new URL(sourceUrl).origin) return;
      normalizePublicResearchPage(`${target.origin}${target.pathname}`);
      if (/\b(book|booking|appointment|schedule)\b/i.test(`${$(anchor).text()} ${target.pathname}`)) found = true;
    } catch { /* Only supported public links contribute evidence. */ }
  });
  return found;
}

export async function crawlBusinessWebsite(raw: string, dependencies: WebsiteAuditDependencies = {}): Promise<BusinessCrawlEvidence> {
  const session = createBoundedResearchSession(dependencies, "business");
  try {
    const home = await session.fetchPage(normalizeResearchUrl(raw));
    const $ = inertPage(home.html);
    const checkedAt = (dependencies.now?.() ?? new Date()).toISOString();
    const title = text($("title").first().text(), 240);
    const description = text($("meta[name='description']").first().attr("content"), 500);
    const heading = text($("h1").first().text(), 240);
    const businessName = text($("meta[property='og:site_name']").first().attr("content"), 180) || heading.slice(0, 180) || title.slice(0, 180);
    const contacts: BusinessContact[] = [];
    const pageUrls = [home.sourceUrl];
    const observations: string[] = [];
    const hasViewport = $("meta[name='viewport']").length > 0;
    const hasBookingLink = bookingLink($, home.sourceUrl);
    collectContacts($, home.sourceUrl, checkedAt, contacts);
    const contactUrl = contactPage($, home.sourceUrl);
    if (contactUrl) {
      try {
        const contact = await session.fetchPage(contactUrl);
        pageUrls.push(contact.sourceUrl);
        collectContacts(inertPage(contact.html), contact.sourceUrl, checkedAt, contacts);
      } catch (error) {
        // A budget expiry is terminal: no caller can mistake partial research for a complete operation.
        if (error instanceof WebsiteAuditError && error.code === "timeout") throw error;
        observations.push("The linked contact/about page could not be checked; contacts are limited to the homepage.");
      }
    }
    if (!title) observations.push("The homepage has no title element with text.");
    if (!description) observations.push("The homepage has no meta description.");
    if (!hasViewport) observations.push("The homepage has no viewport metadata.");
    if (!hasBookingLink) observations.push("No recognized booking link was found in the homepage HTML.");
    if (!contacts.length) observations.push("No supported public email or labelled South African telephone contact details were found on the checked pages.");
    return { sourceUrl: home.sourceUrl, checkedAt, businessName, title, description, heading, pageUrls, contacts, observations, hasViewport, hasBookingLink };
  } finally { session.dispose(); }
}

const listingHosts = [
  "yellowpages.co.za", "brabys.com", "snupit.co.za", "cylex.net.za", "cylex.co.za", "yell.com",
  "bark.com", "uptasker.co.za", "tripadvisor.com", "tripadvisor.co.za", "booking.com", "airbnb.com",
  "trustpilot.com", "hellopeter.com", "yelp.com", "indeed.com", "gumtree.co.za", "hotfrog.co.za",
  "business.site", "linktr.ee", "bit.ly", "tinyurl.com", "t.co", "foursquare.com",
  "sayellow.com", "africanadvice.com", "findglocal.com", "africabz.com", "enrollbusiness.com",
];

export async function discoverBusinessWebsites(raw: string, dependencies: WebsiteAuditDependencies = {}): Promise<{ sourceUrl: string; checkedAt: string; discoveredUrls: string[] }> {
  const source = normalizePublicResearchPage(raw);
  const session = createBoundedResearchSession(dependencies, "business");
  try {
    const page = await session.fetchPage(source);
    const $ = inertPage(page.html);
    const sourceHost = new URL(page.sourceUrl).hostname.replace(/^www\./, "");
    const discovered = new Map<string, string>();
    $("a[href]").each((_index, anchor) => {
      if (discovered.size >= 20) return;
      try {
        const link = new URL($(anchor).attr("href") ?? "", page.sourceUrl);
        const normalized = normalizeResearchUrl(link.href);
        const host = new URL(normalized).hostname.replace(/^www\./, "");
        if (host === sourceHost || listingHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) return;
        discovered.set(host, normalized);
      } catch { /* No fetch occurs for unsupported or external non-website links. */ }
    });
    return { sourceUrl: page.sourceUrl, checkedAt: (dependencies.now?.() ?? new Date()).toISOString(), discoveredUrls: [...discovered.values()] };
  } finally { session.dispose(); }
}
