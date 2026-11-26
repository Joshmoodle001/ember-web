import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { logAccountEvent } from "@/lib/workspace-identity";

export async function POST(request: NextRequest) {
  if (!hasAllowedStaffOrigin(request, true)) return NextResponse.json({ error: "Request not permitted." }, { status: 403 });
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return NextResponse.json({ error: "Sign-out could not be confirmed." }, { status: 503, headers });
    if (user) await logAccountEvent(user.id, "sign_out").catch(() => {});
  } catch {
    return NextResponse.json({ error: "Sign-out could not be confirmed." }, { status: 503, headers });
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303, headers });
}
