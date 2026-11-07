import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function syncSecurityHeaders(appRoot, outputDirectory) {
  const htmlFiles = (await readdir(outputDirectory)).filter(file => file.endsWith(".html")).sort();
  if (!htmlFiles.length) throw new Error("No generated public HTML documents were found.");
  const policies = new Map();
  for (const file of htmlFiles) {
    const hashes = new Set();
    const html = await readFile(path.join(outputDirectory, file), "utf8");
    for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/.test(script[1]) || !script[2].trim()) continue;
      if (!/\btype="application\/ld\+json"/i.test(script[1])) throw new Error("Executable inline scripts are not permitted on the public site.");
      hashes.add("'sha256-" + createHash("sha256").update(script[2]).digest("base64") + "'");
    }
    const scriptSources = ["'self'", ...[...hashes].sort()].join(" ");
    const policy = [
      "default-src 'self'", "script-src " + scriptSources,
      "style-src 'self'", "style-src-attr 'unsafe-inline'", "img-src 'self' data:",
      "font-src 'self'", "connect-src 'self'", "frame-src https://calendar.google.com",
      "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'", "form-action 'self'",
    ].join("; ");
    const route = file === "index.html" ? "/" : "/" + file.slice(0, -5);
    policies.set(route, policy);
  }
  const configPath = path.join(appRoot, "vercel.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const commonRule = config.headers.find(rule => rule.source === "/(.*)");
  if (!commonRule) throw new Error("The public site common security header rule is missing.");
  commonRule.headers = commonRule.headers.filter(header => header.key.toLowerCase() !== "content-security-policy");

  for (const rule of config.headers) {
    rule.headers = rule.headers.filter(header => header.key.toLowerCase() !== "content-security-policy");
  }
  config.headers = config.headers.filter(rule => rule.source === "/(.*)" || rule.headers.length > 0);

  for (const [route, policy] of policies) {
    let rule = config.headers.find(candidate => candidate.source === route);
    if (!rule) {
      rule = { source: route, headers: [] };
      config.headers.push(rule);
    }
    rule.headers.push({ key: "Content-Security-Policy", value: policy });
  }
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
}
