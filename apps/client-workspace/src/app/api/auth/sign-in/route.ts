import { NextResponse, type NextRequest } from "next/server";
import { getAdminEmails } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimits, getTrustedClientIp } from "@/lib/rate-limit";
import { getWorkspaceSiteOrigin } from "@/lib/public-links";
import { createClient } from "@/lib/supabase/server";
import { readLimitedText } from "@/lib/request-body";

const genericMessage = "If this address is eligible for workspace access, a one-time sign-in link will be sent when the request is accepted.";
const unavailableMessage = "Sign-in is temporarily unavailable. Please try again later.";

function authJson(body: Record<string, string>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" },
  });
}

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > 2_000) {
    return authJson({ error: "Please check the email address and try again." }, 400);
  }

  let email = "";
  try {
    const rawBody = await readLimitedText(request, 2_000);
    const body = JSON.parse(rawBody) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  } catch {
    return authJson({ error: "Please check the email address and try again." }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return authJson({ error: "Please check the email address and try again." }, 400);

  const siteOrigin = getWorkspaceSiteOrigin();
  if (!siteOrigin) return authJson({ error: unavailableMessage }, 503);

  try {
    const serviceClient = createServiceClient();
    const clientIp = getTrustedClientIp(request.headers);
    if (clientIp && !await checkRateLimits(serviceClient, [
      { scope: "auth:ip", identity: clientIp, limit: 10, windowSeconds: 900 },
    ])) {
      return authJson({ error: "Please wait a few minutes before requesting another sign-in link." }, 429);
    }
    if (!await checkRateLimits(serviceClient, [
      { scope: "auth:email", identity: email, limit: 3, windowSeconds: 900 },
    ])) {
      return authJson({ error: "Please wait a few minutes before requesting another sign-in link." }, 429);
    }

    // Apply the same rate limits to every valid address before the allowlist response so repeated
    // probes cannot distinguish staff emails through different 202/429 statuses.
    if (!getAdminEmails().includes(email)) return authJson({ message: genericMessage }, 202);

    // The SSR client stores the PKCE verifier in response cookies so that this same browser can
    // exchange the code when the email link returns to /auth/callback.
    const supabase = await createClient();
    const callbackUrl = new URL("/auth/callback", siteOrigin);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl.toString(), shouldCreateUser: false },
    });
    if (error) {
      if (error.status === 429) return authJson({ message: genericMessage }, 202);
      return authJson({ error: unavailableMessage }, 503);
    }
    return authJson({ message: genericMessage }, 202);
  } catch {
    return authJson({ error: unavailableMessage }, 503);
  }
}
