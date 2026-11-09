import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.email_confirmed_at) return NextResponse.json({ error: "Sign in with a confirmed client account." }, { status: 401, headers });
    const service=createServiceClient();
    const {data:identity,error:identityError}=await service.rpc("workspace_identity",{p_actor_id:user.id});
    if(identityError||identity?.role!=="client")return NextResponse.json({error:"Approved client access is required."},{status:403,headers});
    const { data, error } = await service.rpc("get_client_account", { p_user_id: user.id });
    if (error) return NextResponse.json({ error: "Your account could not be loaded. Please try again." }, { status: 503, headers });
    const updates=await service.rpc("workspace_client_updates",{p_actor_id:user.id});
    if(updates.error)return NextResponse.json({error:"Project updates could not be loaded."},{status:503,headers});
    return NextResponse.json({ accounts: data ?? [],updates:updates.data??[] }, { headers });
  } catch { return NextResponse.json({ error: "Your account is temporarily unavailable." }, { status: 503, headers }); }
}
