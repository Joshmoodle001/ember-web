import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Clear the browser's workspace route by sending the user back to sign in.
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
