import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedPasswordLoginOrigin } from "@/lib/password-login";
export async function POST(request: NextRequest) {
  if (!isAllowedPasswordLoginOrigin(request.headers.get("origin"), process.env.NODE_ENV)) return NextResponse.json({ error: "Request not permitted." }, { status: 403 });
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return NextResponse.json({ error: "Sign out could not be completed. Please retry." }, { status: 503 });
  return NextResponse.redirect(new URL("/account/login", process.env.NODE_ENV === "production" ? "https://emberweb.co.za" : request.url), 303);
}
