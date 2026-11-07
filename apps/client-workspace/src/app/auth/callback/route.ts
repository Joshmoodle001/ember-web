import { NextResponse, type NextRequest } from "next/server";
import { getWorkspaceSiteOrigin } from "@/lib/public-links";
import { createClient } from "@/lib/supabase/server";
import { completeAuthCallback, getSafeNextPath } from "@/lib/auth-flow";

function authRedirect(url: URL, status = 307) {
  return NextResponse.redirect(url, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "Referrer-Policy": "no-referrer" },
  });
}

export async function GET(request: NextRequest) {
  const siteOrigin = getWorkspaceSiteOrigin();
  if (!siteOrigin || request.nextUrl.origin !== siteOrigin) {
    return new Response("Workspace origin is not configured for this host.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "Referrer-Policy": "no-referrer" },
    });
  }

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const safeNextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));

  if (code || tokenHash) {
    try {
      const shouldCreateClient = Boolean(code) || type === "email" || type === "invite";
      const callbackOutcome = shouldCreateClient
        ? await completeAuthCallback((await createClient()).auth, { code, tokenHash, type })
        : "invalid";
      if (callbackOutcome === "completed") return authRedirect(new URL(safeNextPath, siteOrigin));
    } catch {
      return authRedirect(new URL("/login?error=link", siteOrigin));
    }
  }

  if (!code && !tokenHash) {
    const completionUrl = new URL("/auth/legacy-completion", siteOrigin);
    completionUrl.searchParams.set("next", safeNextPath);
    if (request.nextUrl.searchParams.has("error")) completionUrl.searchParams.set("error", "link");
    return authRedirect(completionUrl);
  }

  return authRedirect(new URL("/login?error=link", siteOrigin));
}
