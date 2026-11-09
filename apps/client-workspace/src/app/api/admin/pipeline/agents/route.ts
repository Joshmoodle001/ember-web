import { NextResponse } from "next/server";
import { randomBytes,createHash } from "node:crypto";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { isUuid } from "@/lib/client-account";
import { readLimitedText } from "@/lib/request-body";
import { checkRateLimits } from "@/lib/rate-limit";
export async function POST(request:Request) {
 const auth=await requireAdmin();if(!auth.ok)return auth.response;
 const headers={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"};
 if(!hasAllowedStaffOrigin(request,true))return NextResponse.json({error:"Request denied."},{status:403,headers});
 try {
  const p=JSON.parse(await readLimitedText(request,2000));
  if(!isUuid(p.projectId)||typeof p.label!=="string"||p.label.trim().length<2||p.label.length>100)return NextResponse.json({error:"Choose an allocated project and agent name."},{status:400,headers});
  const service=createServiceClient();if(!await checkRateLimits(service,[{scope:"agent:issue",identity:auth.user.id,limit:10,windowSeconds:3600}]))return NextResponse.json({error:"Please wait before creating another credential."},{status:429,headers});
  const token="ewp_"+randomBytes(32).toString("base64url");
  const {data,error}=await service.rpc("workspace_agent_key",{p_actor_id:auth.user.id,p_project_id:p.projectId,p_label:p.label.trim(),p_token_hash:createHash("sha256").update(token).digest("hex")});
  if(error)return NextResponse.json({error:"This project cannot create another agent connection. Check your assignment and existing connections."},{status:403,headers});
  return NextResponse.json({id:data,token,url:`https://portal.emberweb.co.za/api/agent/projects/${p.projectId}`,expiresInDays:30},{status:201,headers});
 }catch{return NextResponse.json({error:"Agent access could not be created."},{status:503,headers});}
}
