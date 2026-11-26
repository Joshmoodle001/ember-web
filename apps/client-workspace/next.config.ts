import type { NextConfig } from "next";
import { resolve } from "node:path";

const workspaceRoot = resolve(__dirname, "../..");
const disconnectedPreview = process.env.VERCEL_ENV === "preview" && !process.env.EMBERWEB_PREVIEW_SUPABASE_HOST;
if (process.env.VERCEL_ENV === "preview" && !disconnectedPreview) {
  const host = process.env.EMBERWEB_PREVIEW_SUPABASE_HOST;
  const liveHosts = new Set(["szucqxbkhjotszfaekex.supabase.co", "hbdxhbwufgkrwqxpieds.supabase.co"]);
  if (!/^[a-z0-9]+\.supabase\.co$/.test(host ?? "") || liveHosts.has(host ?? "") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL !== `https://${host}` ||
    process.env.EMBERWEB_PORTAL_TOKEN || process.env.RESEND_API_KEY ||
    process.env.PAYFAST_MODE !== "sandbox") {
    throw new Error("Preview integrations require an isolated database, disabled live mail and sandbox payments.");
  }
}
const paymentOrigins = "https://www.payfast.co.za https://sandbox.payfast.co.za";
const portalReportPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://calendar.google.com",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  `form-action 'self' ${paymentOrigins}`,
].join("; ");

const nextConfig: NextConfig = {
  ...(disconnectedPreview ? { env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" } } : {}),
  poweredByHeader: false,
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  async headers() {
    return [{source:"/account/sw.js",headers:[{key:"Service-Worker-Allowed",value:"/account"},{key:"Cache-Control",value:"no-cache"}]},{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: `object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' ${paymentOrigins}` },
      { key: "Content-Security-Policy-Report-Only", value: portalReportPolicy },
    ] }];
  },
};

export default nextConfig;
