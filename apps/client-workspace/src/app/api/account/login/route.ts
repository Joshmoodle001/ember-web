import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readLimitedText } from "@/lib/request-body";
import { checkRateLimits, getTrustedClientIp } from "@/lib/rate-limit";
import { handleClientLogin } from "@/lib/client-login";
import { isAllowedPasswordLoginOrigin } from "@/lib/password-login";
import { matchesUsernameLoginIdentity, parseClientLoginCredentials, resolveUsernameLogin } from "@/lib/username-login";
import { dashboardDestination } from "@/lib/login-destination";
import { getAdminEmails } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  const result = await handleClientLogin(request, {
    nodeEnv: process.env.NODE_ENV,
    isAllowedOrigin: isAllowedPasswordLoginOrigin,
    parseCredentials: parseClientLoginCredentials,
    readBody: readLimitedText,
    checkRateLimits: (identifier, incoming) => checkRateLimits(createServiceClient(), [
      { scope: "account:login:email", identity: identifier, limit: 5, windowSeconds: 900 },
      { scope: "account:login:ip", identity: getTrustedClientIp(incoming.headers) ?? "unknown", limit: 10, windowSeconds: 900 },
    ]),
    checkCanonicalEmailRateLimit: (email) => checkRateLimits(createServiceClient(), [
      { scope: "account:login:email", identity: email, limit: 5, windowSeconds: 900 },
    ]),
    resolveUsername: (username) => resolveUsernameLogin(username, {
      findUserId: async (value) => {
        const { data, error } = await createServiceClient().rpc("resolve_workspace_login_username", { p_username: value });
        if (error) throw new Error("Login directory is unavailable.");
        return typeof data === "string" ? data : null;
      },
      getUserById: async (userId) => {
        const { data, error } = await createServiceClient().auth.admin.getUserById(userId);
        return error ? null : data.user;
      },
    }),
    dummyAuthenticate: async (password) => {
      const supabase = await createClient();
      const { data } = await supabase.auth.signInWithPassword({ email: `invalid-${randomUUID()}@invalid.example`, password });
      if (data.user) await supabase.auth.signOut();
    },
    authenticate: async (credentials, expectedUserId) => {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error || !data.user || !data.user.email_confirmed_at || !matchesUsernameLoginIdentity(data.user, expectedUserId)) {
        if (data.user) await supabase.auth.signOut();
        return null;
      }
      return dashboardDestination(data.user, getAdminEmails());
    },
  });
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "private, no-store" } });
}
