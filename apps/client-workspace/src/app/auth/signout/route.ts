import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { logAccountEvent } from "@/lib/workspace-identity";

export async function POST(request: NextRequest) {
  if (!hasAllowedStaffOrigin(request, true)) return NextResponse.json({ error: "Request not permitted." }, { status: 403 });
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await logAccountEvent(user.id, "sign_out").catch(() => {});
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Clear the browser's workspace route by sending the user back to sign in.
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
