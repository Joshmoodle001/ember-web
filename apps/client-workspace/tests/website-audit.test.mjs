import assert from "node:assert/strict";
import test from "node:test";
import { WebsiteAuditError, auditWebsite, normalizeResearchUrl } from "../src/lib/website-audit.ts";

const publicAddress = "93.184.216.34";
const checkedAt = new Date("2026-10-18T10:30:00.000Z");

function response(statusCode, body = "", headers = {}) {
  return { statusCode, headers, body: Buffer.from(body, "utf8") };
}

function notFoundRobots(headers = {}) {
  return response(404, "", headers);
}

function htmlResponse(body, headers = {}) {
  return response(200, body, { "content-type": "text/html; charset=utf-8", ...headers });
}

function harness(responses, { resolveA, transport, deadlineMs, now = () => checkedAt } = {}) {
  const dnsCalls = [];
  const requests = [];
  const queue = [...responses];
  const dependencies = {
    now,
    ...(deadlineMs === undefined ? {} : { deadlineMs }),
    resolveA: resolveA ?? (async (hostname) => {
      dnsCalls.push(hostname);
      return [publicAddress];
    }),
    transport: transport ?? (async (url, options) => {
      requests.push({ url: new URL(url.href), options });
      const next = queue.shift();
      if (!next) throw new Error("No synthetic response was queued.");
      return typeof next === "function" ? next(url, options) : next;
    }),
  };
  return { dependencies, dnsCalls, requests, queue };
}

function errorCode(code) {
  return (error) => error instanceof WebsiteAuditError && error.code === code;
}

test("normalizes to a public HTTPS homepage and drops path, query, and fragment", () => {
  assert.equal(normalizeResearchUrl("  https://www.sample-business.co.za/about?ref=mail#team  "), "https://www.sample-business.co.za/");
  assert.equal(normalizeResearchUrl("sample-business.co.za/contact"), "https://sample-business.co.za/");
  assert.equal(normalizeResearchUrl("https://sample-business.co.za:443/about"), "https://sample-business.co.za/");
});

test("rejects non-HTTPS, credentials, nonstandard ports, IP literals, local names, Maps, and social hosts", () => {
  const invalid = [
    "http://sample-business.co.za/",
    "javascript:alert(1)",
    "https://user:pass@sample-business.co.za/",
    "https://sample-business.co.za:8443/",
    "https://127.0.0.1/",
    "https://2130706433/",
    "https://[::1]/",
    "https://metadata.google.internal/",
    "https://printer.local/",
    "https://sample-business.test/",
    "https://maps.google.co.za/",
    "https://maps.app.goo.gl/abc",
    "https://www.facebook.com/example/",
    "https://instagram.com/example/",
  ];
  for (const value of invalid) assert.throws(() => normalizeResearchUrl(value), errorCode("unsafe_target"), value);
});

test("audit extracts bounded public metadata and safe link booleans without script/style/noscript text", async () => {
  const html = `<!doctype html><html><head>
    <title>  North &amp; Elm  </title>
    <meta name="description" content="A neighbourhood studio">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script><h1>Injected title</h1><a href="/contact">Contact</a></script>
    <style>.hide { display:none }</style>
  </head><body>
    <noscript><a href="/booking">Book</a></noscript>
    <h1>Made for the coast</h1>
    <a href="/contact">Contact us</a>
    <a href="/book">Book an appointment</a>
    <a href="https://evil.example/contact">External contact</a>
    <a href="mailto:owner@sample-business.co.za">Email</a>
    <a href="https://calendar.google.com/calendar/appointments/schedules/abc_123">Schedule</a>
  </body></html>`;
  const h = harness([notFoundRobots(), htmlResponse(html)]);

  const result = await auditWebsite("https://sample-business.co.za/about", h.dependencies);
  assert.deepEqual(result, {
    sourceUrl: "https://sample-business.co.za/",
    checkedAt: checkedAt.toISOString(),
    title: "North & Elm",
    description: "A neighbourhood studio",
    heading: "Made for the coast",
    hasViewport: true,
    hasContactLink: true,
    hasBookingLink: true,
    observations: [],
  });
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[0].url.pathname, "/robots.txt");
  assert.equal(h.requests[1].url.pathname, "/");
});

test("limits metadata and reports only factual missing homepage evidence", async () => {
  const longValue = "x".repeat(700);
  const html = `<html><head><title>${"T".repeat(400)}</title><meta name="description" content="${longValue}"></head><body><h1>${"H".repeat(400)}</h1><a href="mailto:person@example.com">Contact</a><a href="https://calendar.google.com/">Calendar</a></body></html>`;
  const h = harness([notFoundRobots(), htmlResponse(html)]);
  const result = await auditWebsite("sample-business.co.za", h.dependencies);

  assert.equal(result.title.length, 240);
  assert.equal(result.description.length, 500);
  assert.equal(result.heading.length, 240);
  assert.equal(result.hasViewport, false);
  assert.equal(result.hasContactLink, false, "email addresses and mailto targets are not treated as extracted contact details");
  assert.equal(result.hasBookingLink, false, "a generic Google Calendar home page is not a recognized schedule");
  assert.deepEqual(result.observations, [
    "The homepage has no viewport metadata.",
    "No same-site contact link was found in the homepage HTML.",
    "No recognized booking link was found in the homepage HTML.",
  ]);
});

test("checks the A record set and rejects any private or reserved address before transport", async () => {
  let transportCalls = 0;
  const h = harness([], {
    resolveA: async () => [publicAddress, "10.20.30.40"],
    transport: async () => { transportCalls += 1; return notFoundRobots(); },
  });
  await assert.rejects(auditWebsite("sample-business.co.za", h.dependencies), errorCode("unsafe_target"));
  assert.equal(transportCalls, 0);
});

test("re-resolves each request and blocks a DNS rebinding answer before the homepage fetch", async () => {
  let resolution = 0;
  let transportCalls = 0;
  const h = harness([], {
    resolveA: async () => ++resolution === 1 ? [publicAddress] : ["169.254.169.254"],
    transport: async () => { transportCalls += 1; return notFoundRobots(); },
  });
  await assert.rejects(auditWebsite("sample-business.co.za", h.dependencies), errorCode("unsafe_target"));
  assert.equal(resolution, 2);
  assert.equal(transportCalls, 1, "only the robots request may run before the rebinding response is rejected");
});

test("pins HTTPS to one validated IPv4 while retaining the original hostname and strict request options", async () => {
  const h = harness([notFoundRobots(), htmlResponse("<html><head><title>Safe</title></head></html>")]);
  await auditWebsite("sample-business.co.za", h.dependencies);
  const page = h.requests[1];
  const options = page.options;
  assert.equal(page.url.protocol, "https:");
  assert.equal(options.hostname, "sample-business.co.za");
  assert.equal(options.servername, "sample-business.co.za");
  assert.equal(options.port, 443);
  assert.equal(options.path, "/");
  assert.equal(options.method, "GET");
  assert.equal(options.family, 4);
  assert.equal(options.autoSelectFamily, false);
  assert.equal(options.agent, false);
  assert.equal(options.maxHeaderSize, 16 * 1024);
  assert.equal(options.readTimeoutMs, 8000);
  assert.equal(options.maxBytes, 256 * 1024);
  assert.equal(options.headers["Accept-Encoding"], "identity");
  assert.match(options.headers["User-Agent"], /^EmberWebResearch\//);
  assert.equal("Cookie" in options.headers, false);
  assert.equal("Authorization" in options.headers, false);

  const pinned = await new Promise((resolve, reject) => options.lookup(options.hostname, { family: 4 }, (error, address, family) => {
    if (error) reject(error);
    else resolve({ address, family });
  }));
  assert.deepEqual(pinned, { address: publicAddress, family: 4 });
  await new Promise((resolve) => options.lookup("different.example.net", { family: 4 }, (error) => {
    assert.equal(error?.code, "EHOSTUNREACH");
    resolve();
  }));
});

test("checks robots rules before requesting the homepage and denies 401, 403, or matching disallow", async () => {
  for (const status of [401, 403]) {
    const h = harness([response(status), htmlResponse("<h1>Should not load</h1>")]);
    await assert.rejects(auditWebsite("sample-business.co.za", h.dependencies), errorCode("robots_denied"));
    assert.equal(h.requests.length, 1);
  }

  const denied = harness([
    response(200, "User-agent: EmberWebResearch\nDisallow: /\n", { "content-type": "text/plain" }),
    htmlResponse("<h1>Should not load</h1>"),
  ]);
  await assert.rejects(auditWebsite("sample-business.co.za", denied.dependencies), errorCode("robots_denied"));
  assert.equal(denied.requests.length, 1);
});

test("robots 404 allows a fetch; server errors and unsupported robots content fail closed", async () => {
  const allowed404 = harness([
    notFoundRobots({ "content-length": "999999" }),
    htmlResponse("<html><head><title>Available</title></head></html>"),
  ]);
  const allowed = await auditWebsite("sample-business.co.za", allowed404.dependencies);
  assert.equal(allowed.title, "Available");

  const serverError = harness([response(503)]);
  await assert.rejects(auditWebsite("sample-business.co.za", serverError.dependencies), errorCode("fetch_failed"));

  const wrongMime = harness([response(200, "<html></html>", { "content-type": "text/html" })]);
  await assert.rejects(auditWebsite("sample-business.co.za", wrongMime.dependencies), errorCode("unsupported_content"));

  const oversizedRobots = harness([response(200, "x".repeat(64 * 1024 + 1), { "content-type": "text/plain" })]);
  await assert.rejects(auditWebsite("sample-business.co.za", oversizedRobots.dependencies), errorCode("too_large"));
});

test("follows at most two HTTPS homepage redirects to the same host or its www counterpart", async () => {
  const h = harness([
    notFoundRobots(),
    response(301, "", { location: "https://www.sample-business.co.za/" }),
    notFoundRobots(),
    htmlResponse("<html><head><title>Final host</title></head></html>"),
  ]);
  const result = await auditWebsite("sample-business.co.za", h.dependencies);
  assert.equal(result.sourceUrl, "https://www.sample-business.co.za/");
  assert.deepEqual(h.requests.map(({ url }) => `${url.hostname}${url.pathname}`), [
    "sample-business.co.za/robots.txt",
    "sample-business.co.za/",
    "www.sample-business.co.za/robots.txt",
    "www.sample-business.co.za/",
  ]);
});

test("rejects external, non-HTTPS, and non-homepage redirects without requesting their targets", async () => {
  for (const location of [
    "https://attacker.example/",
    "http://www.sample-business.co.za/",
    "https://www.sample-business.co.za/about",
    "https://user@www.sample-business.co.za/",
  ]) {
    const h = harness([notFoundRobots(), response(302, "", { location })]);
    await assert.rejects(auditWebsite("sample-business.co.za", h.dependencies), errorCode("unsafe_target"), location);
    assert.equal(h.requests.length, 2, "redirect target must not be fetched");
  }
});

test("fails when the redirect limit is exceeded", async () => {
  const h = harness([
    notFoundRobots(), response(301, "", { location: "https://www.sample-business.co.za/" }),
    notFoundRobots(), response(301, "", { location: "https://sample-business.co.za/" }),
    notFoundRobots(), response(301, "", { location: "https://www.sample-business.co.za/" }),
  ]);
  await assert.rejects(auditWebsite("sample-business.co.za", h.dependencies), errorCode("fetch_failed"));
  assert.equal(h.requests.length, 6);
});

test("rejects oversized, compressed, and non-HTML homepage responses", async () => {
  const oversized = harness([notFoundRobots(), response(200, "", { "content-type": "text/html", "content-length": String(256 * 1024 + 1) })]);
  await assert.rejects(auditWebsite("sample-business.co.za", oversized.dependencies), errorCode("too_large"));

  const oversizedStream = harness([notFoundRobots(), response(200, "x".repeat(256 * 1024 + 1), { "content-type": "text/html" })]);
  await assert.rejects(auditWebsite("sample-business.co.za", oversizedStream.dependencies), errorCode("too_large"));

  const compressed = harness([notFoundRobots(), htmlResponse("<html></html>", { "content-encoding": "gzip" })]);
  await assert.rejects(auditWebsite("sample-business.co.za", compressed.dependencies), errorCode("unsupported_content"));

  const nonHtml = harness([notFoundRobots(), response(200, "%PDF", { "content-type": "application/pdf" })]);
  await assert.rejects(auditWebsite("sample-business.co.za", nonHtml.dependencies), errorCode("unsupported_content"));
});

test("enforces the total deadline during DNS and transport and propagates abort signals", async () => {
  let dnsAborted = false;
  const dnsTimeout = harness([], {
    deadlineMs: 5,
    resolveA: async (_hostname, signal) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => { dnsAborted = true; reject(new Error("aborted")); }, { once: true });
    }),
  });
  await assert.rejects(auditWebsite("sample-business.co.za", dnsTimeout.dependencies), errorCode("timeout"));
  assert.equal(dnsAborted, true);

  let transportAborted = false;
  let transportCount = 0;
  const requestTimeout = harness([], {
    deadlineMs: 5,
    transport: async (_url, options) => {
      transportCount += 1;
      if (transportCount === 1) return notFoundRobots();
      return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => {
        transportAborted = true;
        reject(new Error("aborted"));
      }, { once: true }));
    },
  });
  await assert.rejects(auditWebsite("sample-business.co.za", requestTimeout.dependencies), errorCode("timeout"));
  assert.equal(transportAborted, true);
});

test("maps transport errors to a generic typed fetch failure", async () => {
  const h = harness([], { transport: async () => { throw new Error("provider detail and response body must not escape"); } });
  await assert.rejects(auditWebsite("sample-business.co.za", h.dependencies), (error) => {
    assert.ok(error instanceof WebsiteAuditError);
    assert.equal(error.code, "fetch_failed");
    assert.equal(error.message, "Website research could not be completed.");
    assert.equal("cause" in error, false);
    return true;
  });
});
