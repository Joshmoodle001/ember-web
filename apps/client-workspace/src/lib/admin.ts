import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { workspaceIdentity } from "@/lib/workspace-identity";

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

  let identity;
  try { identity = await workspaceIdentity(user.id); }
  catch { return { ok: false as const, response: NextResponse.json({error:"Account permissions are temporarily unavailable."},{status:503}) }; }
  if (!identity || !["super_admin","admin"].includes(identity.role)) {
    return { ok: false as const, response: NextResponse.json({ error: "This account is not approved for the workspace." }, { status: 403 }) };
  }

  return { ok: true as const, supabase, user, identity };
}

export async function requireSuperAdmin() {
  const auth = await requireAdmin();
  if(!auth.ok) return auth;
  if(auth.identity.role!=="super_admin") return {ok:false as const,response:NextResponse.json({error:"Super admin access is required."},{status:403})};
  return auth;
}
