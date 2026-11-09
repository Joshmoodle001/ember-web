import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/client-account";
import { readLimitedText } from "@/lib/request-body";
import { checkRateLimits } from "@/lib/rate-limit";
import { validAgentUpdate } from "@/lib/workspace-model";
const headers={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"};
async function handle(request:Request,context:{params:Promise<{projectId:string}>}){
 const {projectId}=await context.params;const token=request.headers.get("authorization")?.match(/^Bearer (ewp_[A-Za-z0-9_-]{43})$/)?.[1];
 if(!token||!isUuid(projectId))return NextResponse.json({error:"A project-scoped bearer credential is required."},{status:401,headers});
 try {
  const service=createServiceClient(),hash=createHash("sha256").update(token).digest("hex");
  if(!await checkRateLimits(service,[{scope:"agent:project",identity:hash,limit:30,windowSeconds:60}]))return NextResponse.json({error:"Rate limit reached."},{status:429,headers});
  const payload=request.method==="POST"?JSON.parse(await readLimitedText(request,16000)):null;
  if(request.method==="POST"&&!validAgentUpdate(payload))return NextResponse.json({error:"Use submissionId (UUID), body, optional clientSummary, and optional stage with the current version."},{status:400,headers});
  const result=await service.rpc("workspace_agent_access",{p_project_id:projectId,p_hash:hash,p_payload:payload});
  if(result.error)return NextResponse.json({error:result.error.code==="40001"?"Version changed. Read the project again before updating its stage.":"Project access or update was rejected."},{status:result.error.code==="40001"?409:403,headers});
  return NextResponse.json({...result.data,instructions:"Post updates at meaningful milestones. Always report failed checks, risks and blockers truthfully in body. A separate clientSummary may describe completed progress without sensitive details; it is a draft until a staff member approves it. Never include passwords, tokens or private customer records. Reuse submissionId when retrying the exact same update. This credential works only for this project."},{headers});
 }catch{return NextResponse.json({error:"Project update is temporarily unavailable. Retry the same submissionId."},{status:503,headers});}
}
export const GET=handle;
export const POST=handle;
