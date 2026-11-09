import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { workspaceIdentity } from "@/lib/workspace-identity";
export async function GET() {
  const headers={"Cache-Control":"private, no-store"};
  try {
    const {data,error}=await(await createClient()).auth.getUser();
    const identity=!error&&data.user?.email_confirmed_at?await workspaceIdentity(data.user.id):null;
    return NextResponse.json(identity?{identity}:{error:"Sign in with an approved account."},{status:identity?200:401,headers});
  }catch{return NextResponse.json({error:"Account access is unavailable."},{status:503,headers});}
}
