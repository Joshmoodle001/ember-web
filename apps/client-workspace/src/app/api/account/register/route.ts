import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { getTrustedClientIp, checkRateLimits } from "@/lib/rate-limit";
import { readLimitedText } from "@/lib/request-body";
import { clientRegistrationOrigin } from "@/lib/client-account";
import { isClientRegistrationEnabled } from "@/lib/client-registration";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!hasAllowedStaffOrigin(request, true)) return NextResponse.json({ error: "Request could not be completed." }, { status: 403, headers });
  const origin = clientRegistrationOrigin(request.headers.get("origin"), process.env.NODE_ENV);
  if (!origin) return NextResponse.json({ error: "Create your account at https://emberweb.co.za/login." }, { status: 403, headers });
  if (!isClientRegistrationEnabled(process.env.CLIENT_REGISTRATION_ENABLED)) return NextResponse.json({ error: "Public registration is not available yet. Contact EmberWeb to arrange your client account." }, { status: 503, headers });
  let body: { email?: unknown; password?: unknown };
  try {
    const parsed: unknown = JSON.parse(await readLimitedText(request, 3000));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    body = parsed as typeof body;
  } catch { return NextResponse.json({ error: "Enter your email and password." }, { status: 400, headers }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128) return NextResponse.json({ error: "Use a valid email and a password of 12–128 characters." }, { status: 400, headers });
  try {
    if (!await checkRateLimits(createServiceClient(), [
      { scope: "client-register:ip", identity: getTrustedClientIp(request.headers) ?? "unknown", limit: 10, windowSeconds: 3600 },
      { scope: "client-register:email", identity: email, limit: 3, windowSeconds: 3600 },
    ])) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429, headers });
    const supabase = await createClient();
    const { data: { user: existing } } = await supabase.auth.getUser();
    if (existing) return NextResponse.json({ error: "Sign out before creating another account." }, { status: 409, headers });
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/account/confirm` } });
    if (error?.status === 429) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429, headers });
    if (error && error.status && error.status >= 500) throw error;
    if (error && !["user_already_exists", "email_exists"].includes(error.code ?? "")) return NextResponse.json({ error: "Registration could not be completed. Check your details and try again." }, { status: 400, headers });
    return NextResponse.json({ message: "Check your email to confirm your account. If you already registered, sign in. EmberWeb must approve access to your client records." }, { status: 202, headers });
  } catch { return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 503, headers }); }
}
