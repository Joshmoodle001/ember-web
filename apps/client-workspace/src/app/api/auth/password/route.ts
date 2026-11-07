import { NextResponse, type NextRequest } from "next/server";
import { getAdminEmails } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimits, getTrustedClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/request-body";
import { handlePasswordLogin } from "@/lib/password-login";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const result = await handlePasswordLogin(request, {
    nodeEnv: process.env.NODE_ENV,
    readBody: readLimitedText,
    isBodyTooLarge: (error) => error instanceof RequestBodyTooLargeError,
    getClientIp: getTrustedClientIp,
    checkRateLimits: async (email, ip) => {
      const serviceClient = createServiceClient();
      return checkRateLimits(serviceClient, [
        { scope: "auth:password:ip", identity: ip, limit: 10, windowSeconds: 900 },
        { scope: "auth:password:email", identity: email, limit: 5, windowSeconds: 900 },
      ]);
    },
    authenticate: async ({ email, password }) => {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return {
        userEmail: data.user?.email ?? null,
        error,
        signOut: async () => {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) throw signOutError;
        },
      };
    },
    isAdminEmail: (email) => getAdminEmails().includes(email),
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" },
  });
}
