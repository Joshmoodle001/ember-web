import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const origin = process.env.NODE_ENV === "production" ? "https://emberweb.co.za" : request.nextUrl.origin;
  if (!params.has("code") && !params.has("token_hash") && !params.has("error")) {
    // A server redirect preserves the original fragment in the browser for legacy links.
    return NextResponse.redirect(new URL("/account/complete", origin));
  }
  let completed = false;
  try {
    const supabase = await createClient();
    const code = params.get("code"), tokenHash = params.get("token_hash"), type = params.get("type");
    if (code) completed = !(await supabase.auth.exchangeCodeForSession(code)).error;
    else if (tokenHash && (type === "signup" || type === "email")) completed = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } catch { completed = false; }
  const response = NextResponse.redirect(new URL(completed ? "/account" : "/account/login?error=confirmation", origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
