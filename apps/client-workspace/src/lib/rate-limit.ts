import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { createServiceClient } from "@/lib/supabase/service";

type ServiceClient = ReturnType<typeof createServiceClient>;
type RateLimitCheck = { scope: string; identity: string; limit: number; windowSeconds: number };

function getRateLimitPepper() {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("A server-side Supabase key is required for rate limiting.");
  return secret;
}

export function getTrustedClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",").map((value) => value.trim()).filter(Boolean).at(-1)
    ?? headers.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) ? candidate.toLowerCase() : null;
}

export async function checkRateLimits(client: ServiceClient, checks: RateLimitCheck[]) {
  const pepper = getRateLimitPepper();
  const results = await Promise.all(checks.map(({ scope, identity, limit, windowSeconds }) => {
    const keyHash = createHmac("sha256", pepper).update(`${scope}\0${identity}`).digest("hex");
    return client.rpc("consume_workspace_rate_limit", {
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
  }));

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("Rate limit check failed:", failed.error.code);
    throw new Error("Request protection is temporarily unavailable.");
  }
  return results.every((result) => result.data === true);
}
