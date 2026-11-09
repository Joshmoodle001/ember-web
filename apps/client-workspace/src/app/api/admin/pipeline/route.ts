import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { readLimitedText } from "@/lib/request-body";
import { validSeedCommand } from "@/lib/workspace-model";
import { isUuid } from "@/lib/client-account";
import { checkRateLimits } from "@/lib/rate-limit";
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request) {
 const auth=await requireAdmin(); if(!auth.ok)return auth.response;
 const params=new URL(request.url).searchParams, service=createServiceClient();
 let seed=params.get("seed");const project=params.get("project");
 if(project){if(!isUuid(project))return NextResponse.json({error:"Invalid project."},{status:400,headers});const found=await service.from("project_seeds").select("id").eq("project_id",project).maybeSingle();seed=found.data?.id??null;if(!seed)return NextResponse.json({error:"Project not found."},{status:404,headers});}
 if(seed&&!isUuid(seed))return NextResponse.json({error:"Invalid seed."},{status:400,headers});
 const time=params.get("beforeTime"),id=params.get("beforeId");
 if((time||id)&&(!time||!Number.isFinite(Date.parse(time))||!isUuid(id)))return NextResponse.json({error:"Invalid history position."},{status:400,headers});
 const result=seed?await service.rpc("workspace_card",{p_actor_id:auth.user.id,p_seed_id:seed,p_before_time:time,p_before_id:id}):await service.rpc("workspace_board",{p_actor_id:auth.user.id});
 if(!result.error&&seed&&result.data?.seed?.project_id){const project=await service.from("projects").select("progress,status").eq("id",result.data.seed.project_id).single();result.data.project=project.data;}
 const offset=params.get("offset");
 if(!seed&&offset){const n=Number(offset);if(!Number.isSafeInteger(n)||n<0||n>100000)return NextResponse.json({error:"Invalid board page."},{status:400,headers});const more=await service.from("project_seeds").select("*").order("updated_at",{ascending:false}).order("id").range(n,n+499);if(more.error)return NextResponse.json({error:"More seeds could not be loaded."},{status:503,headers});if(result.data)result.data.seeds=more.data;}
 return NextResponse.json(result.error?{error:"The pipeline could not be loaded."}:result.data,{status:result.error?503:200,headers});
}
export async function POST(request:Request) {
 const auth=await requireAdmin();if(!auth.ok)return auth.response;
 if(!hasAllowedStaffOrigin(request,true))return NextResponse.json({error:"Request denied."},{status:403,headers});
 try {
  const body=JSON.parse(await readLimitedText(request,20000));if(!validSeedCommand(body))return NextResponse.json({error:"Check the card details."},{status:400,headers});
  const service=createServiceClient();if(!await checkRateLimits(service,[{scope:"pipeline:write",identity:auth.user.id,limit:60,windowSeconds:60}]))return NextResponse.json({error:"Please wait before saving again."},{status:429,headers});
  const {data,error}=await service.rpc("workspace_command",{p_actor_id:auth.user.id,p_payload:body});
  if(error){const status=error.code==="40001"?409:error.code==="42501"?403:["22023","22P02","23514"].includes(error.code)?400:503;return NextResponse.json({error:status===409?"This card changed. Review the latest version before applying your saved edit.":status===403?"This action is not available for your role or assignment.":"The update could not be saved. Check the details and retry."},{status,headers});}
  return NextResponse.json(data,{headers});
 }catch{return NextResponse.json({error:"The update could not be saved."},{status:503,headers});}
}
