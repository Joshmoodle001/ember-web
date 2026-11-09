import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAllowedPasswordLoginOrigin } from "@/lib/password-login";
import { readLimitedText } from "@/lib/request-body";
import { checkRateLimits, getTrustedClientIp } from "@/lib/rate-limit";
import { sendPasswordSetup } from "@/lib/account-email";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export async function GET() {
  try {
    const { data, error } = await (await createClient()).auth.getUser();
    return NextResponse.json({ email: !error && data.user?.email_confirmed_at ? data.user.email : null }, { headers });
  } catch { return NextResponse.json({ email: null }, { headers }); }
}
export async function POST(request: Request) {
  if (!isAllowedPasswordLoginOrigin(request.headers.get("origin"), process.env.NODE_ENV)) return NextResponse.json({ error: "Request not permitted." }, { status: 403, headers });
  try {
    const body = JSON.parse(await readLimitedText(request, 3000));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Enter your account email." }, { status: 400, headers });
    if (!await checkRateLimits(createServiceClient(), [
      { scope: "password-setup:email", identity: email, limit: 3, windowSeconds: 3600 },
      { scope: "password-setup:ip", identity: getTrustedClientIp(request.headers) ?? "unknown", limit: 10, windowSeconds: 3600 },
    ])) return NextResponse.json({ error: "Please wait before requesting another email." }, { status: 429, headers });
    await sendPasswordSetup(email);
    return NextResponse.json({ message: "If this email has an account, a private password link has been sent. Check your inbox and spam folder." }, { status: 202, headers });
  } catch { return NextResponse.json({ error: "The password email could not be sent. Please retry shortly." }, { status: 503, headers }); }
}
export async function PATCH(request: Request) {
  if (!isAllowedPasswordLoginOrigin(request.headers.get("origin"), process.env.NODE_ENV)) return NextResponse.json({ error: "Request not permitted." }, { status: 403, headers });
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email_confirmed_at) return NextResponse.json({ error: "Open your private email link first." }, { status: 401, headers });
    const body = JSON.parse(await readLimitedText(request, 3000));
    if (typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) return NextResponse.json({ error: "Use a password between 12 and 128 characters." }, { status: 400, headers });
    const update = await supabase.auth.updateUser({ password: body.password });
    if (update.error) return NextResponse.json({ error: "The password could not be changed. Try a different password or request a fresh link." }, { status: 400, headers });
    return NextResponse.json({ next: "/login" }, { headers });
  } catch { return NextResponse.json({ error: "Your password could not be saved. Please retry." }, { status: 503, headers }); }
}
