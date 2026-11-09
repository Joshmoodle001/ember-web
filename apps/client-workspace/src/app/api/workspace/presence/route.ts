import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { readLimitedText } from "@/lib/request-body";
import { isUuid } from "@/lib/client-account";
import { checkRateLimits } from "@/lib/rate-limit";
export async function POST(request:Request) {
 const headers={"Cache-Control":"private, no-store"};
 if(!hasAllowedStaffOrigin(request,true))return NextResponse.json({error:"Request denied."},{status:403,headers});
 try {
  const {data,error}=await(await createClient()).auth.getUser(); if(error||!data.user)return NextResponse.json({error:"Sign in required."},{status:401,headers});
  const body=JSON.parse(await readLimitedText(request,2000));
  if(typeof body.path!=="string"||!/^\/(admin|account)(\/[-a-zA-Z0-9_/]*)?$/.test(body.path)||body.path.length>160||(body.projectId!=null&&!isUuid(body.projectId)))return NextResponse.json({error:"Invalid activity."},{status:400,headers});
  const service=createServiceClient(); if(!await checkRateLimits(service,[{scope:"workspace:presence",identity:data.user.id,limit:240,windowSeconds:3600}]))return NextResponse.json({error:"Please wait."},{status:429,headers});
  const result=await service.rpc("workspace_presence_record",{p_actor_id:data.user.id,p_path:body.path,p_project_id:body.projectId??null});
  return NextResponse.json({recorded:!result.error},{status:result.error?403:200,headers});
 }catch{return NextResponse.json({error:"Activity not recorded."},{status:503,headers});}
}
