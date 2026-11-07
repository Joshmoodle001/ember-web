import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/supabase/env";

export async function requireAdmin() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false as const, response: NextResponse.json({ error: "Workspace authentication is not configured." }, { status: 503 }) };
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email) {
    return { ok: false as const, response: NextResponse.json({ error: "Sign in is required." }, { status: 401 }) };
  }

  const approvedEmails = getAdminEmails();
  if (!approvedEmails.includes(user.email.toLowerCase())) {
    return { ok: false as const, response: NextResponse.json({ error: "This account is not approved for the workspace." }, { status: 403 }) };
  }

  return { ok: true as const, supabase, user };
}
