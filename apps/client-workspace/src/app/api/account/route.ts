import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.email_confirmed_at) return NextResponse.json({ error: "Sign in with a confirmed client account." }, { status: 401, headers });
    const { data, error } = await createServiceClient().rpc("get_client_account", { p_user_id: user.id });
    if (error) return NextResponse.json({ error: "Your account could not be loaded. Please try again." }, { status: 503, headers });
    return NextResponse.json({ accounts: data ?? [] }, { headers });
  } catch { return NextResponse.json({ error: "Your account is temporarily unavailable." }, { status: 503, headers }); }
}
