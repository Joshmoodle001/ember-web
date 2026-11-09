import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedPasswordLoginOrigin } from "@/lib/password-login";
import { logAccountEvent } from "@/lib/workspace-identity";
export async function POST(request: NextRequest) {
  if (!isAllowedPasswordLoginOrigin(request.headers.get("origin"), process.env.NODE_ENV)) return NextResponse.json({ error: "Request not permitted." }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await logAccountEvent(user.id, "sign_out").catch(() => {});
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return NextResponse.json({ error: "Sign out could not be completed. Please retry." }, { status: 503 });
  return NextResponse.redirect(new URL("/account/login", process.env.NODE_ENV === "production" ? "https://emberweb.co.za" : request.url), 303);
}
