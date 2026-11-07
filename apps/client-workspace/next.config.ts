import type { NextConfig } from "next";
import { resolve } from "node:path";

const workspaceRoot = resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://www.payfast.co.za https://sandbox.payfast.co.za" },
    ] }];
  },
};

export default nextConfig;
