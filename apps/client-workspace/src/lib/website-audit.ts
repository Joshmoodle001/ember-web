import { Resolver } from "node:dns/promises";
import type { IncomingHttpHeaders } from "node:http";
import { isIP } from "node:net";
import { request as httpsRequest, type RequestOptions as HttpsRequestOptions } from "node:https";
import { loadBuffer } from "cheerio";
import { createRequire } from "node:module";

type RobotsParser = (url: string, contents: string) => { isAllowed(url: string, userAgent?: string): boolean | undefined };

const require = createRequire(import.meta.url);
const robotsParser = require("robots-parser") as RobotsParser;

const TOTAL_DEADLINE_MS = 25_000;
const READ_TIMEOUT_MS = 8_000;
const MAX_HEADER_BYTES = 16 * 1024;
const MAX_ROBOTS_BYTES = 64 * 1024;
const MAX_HTML_BYTES = 256 * 1024;
const USER_AGENT = "EmberWebResearch";
const USER_AGENT_HEADER = "EmberWebResearch/1.0 (+https://emberweb.co.za/outreach/terms)";

const blockedHostSuffixes = [
  "localhost", "local", "internal", "lan", "home", "test", "invalid", "example", "onion", "arpa",
  "google.com", "google.co.za", "google.co.uk", "google.de", "google.fr", "google.ca", "google.com.au",
  "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "tiktok.com", "youtube.com",
  "youtu.be", "whatsapp.com", "wa.me", "snapchat.com", "pinterest.com", "reddit.com", "threads.net",
  "discord.com", "telegram.org", "goo.gl", "g.page",
];

export type WebsiteAuditErrorCode =
  | "robots_denied"
  | "unsafe_target"
  | "fetch_failed"
  | "too_large"
  | "unsupported_content"
  | "timeout";

export class WebsiteAuditError extends Error {
  readonly code: WebsiteAuditErrorCode;

  constructor(code: WebsiteAuditErrorCode) {
    super("Website research could not be completed.");
    this.name = "WebsiteAuditError";
    this.code = code;
  }
}

export type WebsiteEvidence = {
  sourceUrl: string;
  checkedAt: string;
  title: string;
  description: string;
  heading: string;
  hasViewport: boolean;
  hasContactLink: boolean;
  hasBookingLink: boolean;
  observations: string[];
};

type SecureRequestOptions = {
  hostname: string;
  servername: string;
  port: 443;
  path: string;
  method: "GET";
  headers: Record<string, string>;
  family: 4;
  autoSelectFamily: false;
  agent: false;
  maxHeaderSize: number;
  lookup: NonNullable<HttpsRequestOptions["lookup"]>;
  signal: AbortSignal;
  readTimeoutMs: number;
  maxBytes: number;
};

type SecureResponse = {
  statusCode: number;
  headers: IncomingHttpHeaders | Record<string, string | string[] | undefined>;
  body: Uint8Array;
};

export type WebsiteAuditDependencies = {
  /** Test seam. The production resolver uses DNS A records only. */
  resolveA?: (hostname: string, signal: AbortSignal) => Promise<readonly string[]>;
  /** Test seam. The production transport is HTTPS with a pinned IPv4 lookup. */
  transport?: (url: URL, options: SecureRequestOptions) => Promise<SecureResponse>;
  /** Test seam that may shorten, but never extend, the production deadline. */
  deadlineMs?: number;
  now?: () => Date;
};

function unsafeTarget(): never {
  throw new WebsiteAuditError("unsafe_target");
}

function normalizedHost(hostname: string) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

function hasBlockedSuffix(hostname: string) {
  return blockedHostSuffixes.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))
    || /(^|\.)google\.[a-z.]+$/.test(hostname);
}

function isPublicIpv4(address: string) {
  if (isIP(address) !== 4) return false;
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second, third] = octets;

  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 0 && third === 0) return false;
  if (first === 192 && second === 0 && third === 2) return false;
  if (first === 192 && second === 31 && third === 196) return false;
  if (first === 192 && second === 52 && third === 193) return false;
  if (first === 192 && second === 88 && third === 99) return false;
  if (first === 192 && second === 168) return false;
  if (first === 192 && second === 175 && third === 48) return false;
  if (first === 198 && (second === 18 || second === 19)) return false;
  if (first === 198 && second === 51 && third === 100) return false;
  if (first === 203 && second === 0 && third === 113) return false;
  return true;
}

function validateHostname(hostname: string) {
  const host = normalizedHost(hostname);
  if (!host || host.length > 253 || isIP(host) !== 0 || host.includes(":")) unsafeTarget();
  if (!host.includes(".") || hasBlockedSuffix(host)) unsafeTarget();
  if (host.split(".").some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) unsafeTarget();
  return host;
}

export function normalizeResearchUrl(raw: string): string {
  if (typeof raw !== "string" || raw.length > 2048) unsafeTarget();
  const input = raw.trim();
  if (!input || /[\u0000-\u001f\u007f]/.test(input) || input.startsWith("//")) unsafeTarget();

  let url: URL;
  try {
    url = /^[a-z][a-z\d+.-]*:/i.test(input) ? new URL(input) : new URL(`https://${input}`);
  } catch {
    return unsafeTarget();
  }

  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) unsafeTarget();
  const hostname = validateHostname(url.hostname);
  return `https://${hostname}/`;
}

function createDeadline(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timer),
    async run<T>(operation: () => Promise<T>): Promise<T> {
      if (controller.signal.aborted) throw new WebsiteAuditError("timeout");
      let onAbort: (() => void) | undefined;
      const timeout = new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(new WebsiteAuditError("timeout"));
        controller.signal.addEventListener("abort", onAbort, { once: true });
      });
      try {
        return await Promise.race([operation(), timeout]);
      } catch (error) {
        if (controller.signal.aborted) throw new WebsiteAuditError("timeout");
        if (error instanceof WebsiteAuditError) throw error;
        throw new WebsiteAuditError("fetch_failed");
      } finally {
        if (onAbort) controller.signal.removeEventListener("abort", onAbort);
      }
    },
  };
}

async function resolvePublicARecords(hostname: string, signal: AbortSignal): Promise<readonly string[]> {
  const resolver = new Resolver();
  const onAbort = () => resolver.cancel();
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    return await resolver.resolve4(hostname);
  } catch {
    if (signal.aborted) throw new WebsiteAuditError("timeout");
    throw new WebsiteAuditError("fetch_failed");
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

function headerValue(headers: SecureResponse["headers"], name: string): string | null {
  const value = headers[name.toLowerCase() as keyof typeof headers];
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null;
  return typeof value === "string" ? value : null;
}

function contentLength(headers: SecureResponse["headers"]): number | null {
  const value = headerValue(headers, "content-length");
  if (value === null) return null;
  if (!/^\d+$/.test(value)) throw new WebsiteAuditError("unsupported_content");
  const length = Number(value);
  if (!Number.isSafeInteger(length)) throw new WebsiteAuditError("unsupported_content");
  return length;
}

function makePinnedLookup(hostname: string, address: string): NonNullable<HttpsRequestOptions["lookup"]> {
  return ((requestedHostname, options, callback) => {
    if (normalizedHost(requestedHostname) !== normalizedHost(hostname)) {
      const error = Object.assign(new Error("Pinned hostname mismatch."), { code: "EHOSTUNREACH" });
      if (typeof options === "object" && options !== null && "all" in options && options.all) {
        callback(error, []);
      } else {
        callback(error, "", 4);
      }
      return;
    }
    if (typeof options === "object" && options !== null && "all" in options && options.all) {
      callback(null, [{ address, family: 4 }]);
    } else {
      callback(null, address, 4);
    }
  }) as NonNullable<HttpsRequestOptions["lookup"]>;
}

function transportRequest(url: URL, options: SecureRequestOptions): Promise<SecureResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      action();
    };
    const fail = (error: unknown) => settle(() => {
      if (error instanceof WebsiteAuditError) reject(error);
      else if (options.signal.aborted) reject(new WebsiteAuditError("timeout"));
      else reject(new WebsiteAuditError("fetch_failed"));
    });

    let request;
    try {
      const requestOptions = {
        hostname: options.hostname,
        servername: options.servername,
        port: options.port,
        path: options.path,
        method: options.method,
        headers: options.headers,
        family: options.family,
        autoSelectFamily: options.autoSelectFamily,
        agent: options.agent,
        maxHeaderSize: options.maxHeaderSize,
        lookup: options.lookup,
        signal: options.signal,
      } as Parameters<typeof httpsRequest>[1] & { autoSelectFamily: false };
      request = httpsRequest(url, requestOptions, (response) => {
        const statusCode = response.statusCode ?? 0;
        if (statusCode < 200 || statusCode >= 300) {
          const result: SecureResponse = { statusCode, headers: response.headers, body: Buffer.alloc(0) };
          settle(() => resolve(result));
          response.destroy();
          return;
        }

        try {
          const declaredLength = contentLength(response.headers);
          if (declaredLength !== null && declaredLength > options.maxBytes) {
            throw new WebsiteAuditError("too_large");
          }
        } catch (error) {
          response.destroy();
          fail(error);
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;
        response.on("data", (chunk: Buffer | Uint8Array) => {
          const bytes = Buffer.from(chunk);
          total += bytes.byteLength;
          if (total > options.maxBytes) {
            response.destroy(new WebsiteAuditError("too_large"));
            return;
          }
          chunks.push(bytes);
        });
        response.on("end", () => settle(() => resolve({ statusCode, headers: response.headers, body: Buffer.concat(chunks) })));
        response.on("error", fail);
      });
    } catch (error) {
      fail(error);
      return;
    }

    request.setTimeout(options.readTimeoutMs, () => request.destroy(new WebsiteAuditError("timeout")));
    request.on("error", fail);
    request.end();
  });
}

function requestOptions(url: URL, address: string, path: SecureRequestOptions["path"], maxBytes: number, signal: AbortSignal): SecureRequestOptions {
  const hostname = normalizedHost(url.hostname);
  return {
    hostname,
    servername: hostname,
    port: 443,
    path,
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT_HEADER,
      Accept: path === "/robots.txt" ? "text/plain, */*;q=0.1" : "text/html",
      "Accept-Encoding": "identity",
      Connection: "close",
    },
    family: 4,
    autoSelectFamily: false,
    agent: false,
    maxHeaderSize: MAX_HEADER_BYTES,
    lookup: makePinnedLookup(hostname, address),
    signal,
    readTimeoutMs: READ_TIMEOUT_MS,
    maxBytes,
  };
}

async function requestUrl(
  url: URL,
  path: SecureRequestOptions["path"],
  maxBytes: number,
  deadline: ReturnType<typeof createDeadline>,
  dependencies: WebsiteAuditDependencies,
): Promise<SecureResponse> {
  const hostname = validateHostname(url.hostname);
  if (url.protocol !== "https:" || (url.port && url.port !== "443") || url.pathname !== path || url.search || url.hash) unsafeTarget();
  const resolveA = dependencies.resolveA ?? resolvePublicARecords;
  const addresses = await deadline.run(() => resolveA(hostname, deadline.signal));
  if (addresses.length === 0 || addresses.some((address) => !isPublicIpv4(address))) unsafeTarget();

  const pinnedAddress = addresses[0];
  const options = requestOptions(url, pinnedAddress, path, maxBytes, deadline.signal);
  const transport = dependencies.transport ?? transportRequest;
  const response = await deadline.run(() => transport(url, options));
  if (response.body.byteLength > maxBytes) throw new WebsiteAuditError("too_large");
  if (response.statusCode >= 200 && response.statusCode < 300) {
    const declaredLength = contentLength(response.headers);
    if (declaredLength !== null && declaredLength > maxBytes) throw new WebsiteAuditError("too_large");
    const encoding = headerValue(response.headers, "content-encoding");
    if (encoding && encoding.toLowerCase() !== "identity") throw new WebsiteAuditError("unsupported_content");
  }
  return response;
}

function assertCounterpartHost(initialHost: string, candidateHost: string) {
  const initial = normalizedHost(initialHost);
  const candidate = normalizedHost(candidateHost);
  const base = (host: string) => host.startsWith("www.") ? host.slice(4) : host;
  if (base(initial) !== base(candidate)) unsafeTarget();
}

function homepageRedirect(current: URL, location: string, initialHost: string): URL {
  let next: URL;
  try {
    next = new URL(location, current);
  } catch {
    return unsafeTarget();
  }
  if (next.protocol !== "https:" || next.username || next.password || (next.port && next.port !== "443") || next.pathname !== "/" || next.search || next.hash) unsafeTarget();
  const nextHost = validateHostname(next.hostname);
  assertCounterpartHost(initialHost, nextHost);
  return new URL(`https://${nextHost}/`);
}

function isRedirect(statusCode: number) {
  return statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308;
}

async function checkRobots(url: URL, deadline: ReturnType<typeof createDeadline>, dependencies: WebsiteAuditDependencies) {
  const robotsUrl = new URL("/robots.txt", url.origin);
  const response = await requestUrl(robotsUrl, "/robots.txt", MAX_ROBOTS_BYTES, deadline, dependencies);
  if (response.statusCode === 404) return;
  if (response.statusCode === 401 || response.statusCode === 403) throw new WebsiteAuditError("robots_denied");
  if (response.statusCode >= 500) throw new WebsiteAuditError("fetch_failed");
  if (response.statusCode !== 200) throw new WebsiteAuditError("fetch_failed");

  const contentType = headerValue(response.headers, "content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType && contentType !== "text/plain") throw new WebsiteAuditError("unsupported_content");
  const rules = robotsParser(robotsUrl.href, Buffer.from(response.body).toString("utf8"));
  if (rules.isAllowed(url.href, USER_AGENT) === false) throw new WebsiteAuditError("robots_denied");
}

function cleanText(value: string | undefined, maximum: number) {
  return (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum);
}

function safePublicAnchor(href: string, sourceUrl: string): { url: URL; kind: "same-site" | "calendar" } | null {
  let url: URL;
  try {
    url = new URL(href, sourceUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
  const source = new URL(sourceUrl);
  if (normalizedHost(url.hostname) === normalizedHost(source.hostname)) {
    if (/^\/(?:admin|login|setup|auth|api|_next)(?:\/|$)/i.test(url.pathname)) return null;
    return { url, kind: "same-site" };
  }
  if (
    normalizedHost(url.hostname) === "calendar.google.com"
    && /^\/calendar\/appointments\/schedules\/[a-z0-9_-]+$/i.test(url.pathname)
  ) {
    return { url, kind: "calendar" };
  }
  return null;
}

function extractEvidence(html: Uint8Array, sourceUrl: string, checkedAt: string): WebsiteEvidence {
  const $ = loadBuffer(Buffer.from(html));
  $("script, style, noscript").remove();

  const title = cleanText($("title").first().text(), 240);
  const description = cleanText($("meta[name='description']").first().attr("content"), 500);
  const heading = cleanText($("h1").first().text(), 240);
  const hasViewport = $("meta[name='viewport']").length > 0;
  let hasContactLink = false;
  let hasBookingLink = false;

  $("a[href]").each((_index, anchor) => {
    const href = $(anchor).attr("href");
    if (!href) return;
    const safe = safePublicAnchor(href, sourceUrl);
    if (!safe) return;
    const label = cleanText(`${$(anchor).text()} ${$(anchor).attr("aria-label") ?? ""} ${safe.url.pathname}`, 400).toLowerCase();
    if (safe.kind === "calendar" || /\b(book|booking|appointment|schedule)\b/.test(label)) hasBookingLink = true;
    if (safe.kind === "same-site" && /\b(contact|enquir(?:y|ies)|quote|get in touch)\b/.test(label)) hasContactLink = true;
  });

  const observations: string[] = [];
  if (!title) observations.push("The homepage has no title element with text.");
  if (!description) observations.push("The homepage has no meta description.");
  if (!hasViewport) observations.push("The homepage has no viewport metadata.");
  if (!hasContactLink) observations.push("No same-site contact link was found in the homepage HTML.");
  if (!hasBookingLink) observations.push("No recognized booking link was found in the homepage HTML.");

  return { sourceUrl, checkedAt, title, description, heading, hasViewport, hasContactLink, hasBookingLink, observations };
}

export async function auditWebsite(raw: string, dependencies: WebsiteAuditDependencies = {}): Promise<WebsiteEvidence> {
  const normalized = normalizeResearchUrl(raw);
  const initialUrl = new URL(normalized);
  const url = new URL(normalized);
  const requestedDeadline = dependencies.deadlineMs;
  const deadlineMs = typeof requestedDeadline === "number" && Number.isFinite(requestedDeadline)
    ? Math.min(TOTAL_DEADLINE_MS, Math.max(1, requestedDeadline))
    : TOTAL_DEADLINE_MS;
  const deadline = createDeadline(deadlineMs);

  try {
    for (let redirects = 0; ; redirects += 1) {
      await deadline.run(() => checkRobots(url, deadline, dependencies));
      const response = await requestUrl(url, "/", MAX_HTML_BYTES, deadline, dependencies);
      if (isRedirect(response.statusCode)) {
        if (redirects >= 2) throw new WebsiteAuditError("fetch_failed");
        const location = headerValue(response.headers, "location");
        if (!location) throw new WebsiteAuditError("fetch_failed");
        const next = homepageRedirect(url, location, initialUrl.hostname);
        url.href = next.href;
        continue;
      }
      if (response.statusCode !== 200) throw new WebsiteAuditError("fetch_failed");

      const contentType = headerValue(response.headers, "content-type")?.split(";", 1)[0].trim().toLowerCase();
      if (contentType !== "text/html") throw new WebsiteAuditError("unsupported_content");
      const checkedAt = (dependencies.now?.() ?? new Date()).toISOString();
      return extractEvidence(response.body, url.href, checkedAt);
    }
  } catch (error) {
    if (deadline.signal.aborted) throw new WebsiteAuditError("timeout");
    if (error instanceof WebsiteAuditError) throw error;
    throw new WebsiteAuditError("fetch_failed");
  } finally {
    deadline.dispose();
  }
}

/** Validates a research page without resolving or fetching its address. */
export function normalizePublicResearchPage(raw: string): string {
  if (typeof raw !== "string" || raw.length > 2048 || /[\u0000-\u001f\u007f\\]/.test(raw)) unsafeTarget();
  let url: URL;
  try { url = new URL(raw); } catch { return unsafeTarget(); }
  // normalizeResearchUrl applies the same public hostname and HTTPS restrictions.
  const origin = new URL(normalizeResearchUrl(raw)).origin;
  if (url.search || url.hash || url.pathname.length > 500 || /%2f|%5c|%25/i.test(url.pathname)) unsafeTarget();
  let decoded: string;
  try { decoded = decodeURIComponent(url.pathname); } catch { return unsafeTarget(); }
  if (/[\u0000-\u001f\u007f\\]/.test(decoded)
    || decoded.split("/").some((part) => /^(?:admin|administrator|login|logout|signin|signout|setup|auth|api|_next|wp-admin|wp-login(?:\.php)?|checkout|cart)$/i.test(part))) unsafeTarget();
  url = new URL(url.pathname, origin);
  return url.href;
}

/**
 * One bounded research operation. HTML is returned only to the inert parser;
 * callers must never persist it. Every fetch retains the pinned-IP transport.
 */
export function createBoundedResearchSession(dependencies: WebsiteAuditDependencies = {}, htmlLimit: "standard" | "business" = "standard") {
  const requested = dependencies.deadlineMs;
  const milliseconds = typeof requested === "number" && Number.isFinite(requested)
    ? Math.min(30_000, Math.max(1, requested)) : 30_000;
  const deadline = createDeadline(milliseconds);
  const maxHtmlBytes = htmlLimit === "business" ? 1024 * 1024 : MAX_HTML_BYTES;
  let pages = 0;
  let initialHost: string | null = null;
  return {
    dispose: deadline.dispose,
    async fetchPage(raw: string): Promise<{ sourceUrl: string; html: Uint8Array }> {
      if (pages >= 2) throw new WebsiteAuditError("fetch_failed");
      pages += 1;
      const url = new URL(normalizePublicResearchPage(raw));
      if (initialHost) assertCounterpartHost(initialHost, url.hostname);
      else initialHost = url.hostname;
      for (let redirects = 0; ; redirects += 1) {
        await deadline.run(() => checkRobots(url, deadline, dependencies));
        const response = await requestUrl(url, url.pathname, maxHtmlBytes, deadline, dependencies);
        if (isRedirect(response.statusCode)) {
          if (redirects >= 2) throw new WebsiteAuditError("fetch_failed");
          const location = headerValue(response.headers, "location");
          if (!location) throw new WebsiteAuditError("fetch_failed");
          let target: URL;
          try { target = new URL(normalizePublicResearchPage(new URL(location, url).href)); }
          catch { return unsafeTarget(); }
          assertCounterpartHost(initialHost, target.hostname);
          // A redirect may canonicalize the current path, never pivot to another page.
          if (target.pathname.replace(/\/$/, "") !== url.pathname.replace(/\/$/, "")) unsafeTarget();
          url.href = target.href;
          continue;
        }
        if (response.statusCode !== 200) throw new WebsiteAuditError("fetch_failed");
        const contentType = headerValue(response.headers, "content-type")?.split(";", 1)[0].trim().toLowerCase();
        if (contentType !== "text/html") throw new WebsiteAuditError("unsupported_content");
        return { sourceUrl: url.href, html: response.body };
      }
    },
  };
}
