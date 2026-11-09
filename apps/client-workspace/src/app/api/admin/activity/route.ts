import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
export async function GET(request:Request) {
 const auth=await requireSuperAdmin();if(!auth.ok)return auth.response;
 const before=new URL(request.url).searchParams.get("before");
 if(before&&!/^\d{1,16}$/.test(before))return NextResponse.json({error:"Invalid history position."},{status:400});
 const {data,error}=await createServiceClient().rpc("workspace_super_report",{p_actor_id:auth.user.id,p_before:before?Number(before):null});
 return NextResponse.json(error?{error:"Activity could not be loaded."}:{...data,asOf:Date.now()},{status:error?503:200,headers:{"Cache-Control":"private, no-store"}});
}
