import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { readLimitedText } from "@/lib/request-body";
import { checkRateLimits } from "@/lib/rate-limit";
import { isUuid } from "@/lib/client-account";
import { validSeedCommand } from "@/lib/workspace-model";
import { leadPrompt, leadSchema, normalizeLead, type LeadCandidate } from "@/lib/lead-research";
import { createBoundedResearchSession, normalizePublicResearchPage } from "@/lib/website-audit";
import { loadBuffer } from "cheerio";
import { ScrapeGraphAI } from "scrapegraph-js";

export const runtime = "nodejs";
export const maxDuration = 180;
const json = (body:unknown,status=200) => NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request) {
  const auth=await requireSuperAdmin(); if(!auth.ok)return auth.response;
  const page=Number(new URL(request.url).searchParams.get("page")??0);
  if(!Number.isSafeInteger(page)||page<0||page>10000)return json({error:"Invalid page."},400);
  const {data,error}=await createServiceClient().rpc("workspace_lead_research",{p_actor_id:auth.user.id,p_action:"list",p_payload:{page}});
  return error?json({error:"Lead research could not be loaded."},503):json({...data,configured:!!process.env.SGAI_API_KEY});
}
export async function POST(request:Request) {
  const auth=await requireSuperAdmin();if(!auth.ok)return auth.response;
  if(!hasAllowedStaffOrigin(request,true))return json({error:"Request denied."},403);
  let p:Record<string,unknown>;
  try { const value:unknown=JSON.parse(await readLimitedText(request,8000));if(!value||typeof value!=="object"||Array.isArray(value))throw Error();p=value as Record<string,unknown>; }
  catch { return json({error:"Check the request details."},400); }
  const service=createServiceClient();
  if(!await checkRateLimits(service,[{scope:p.action==="run"?"lead-research:run":"lead-research:manage",identity:auth.user.id,limit:p.action==="run"?8:60,windowSeconds:3600}]))return json({error:"Please wait before another research action."},429);
  const call=(action:string,payload:unknown)=>service.rpc("workspace_lead_research",{p_actor_id:auth.user.id,p_action:action,p_payload:payload});
  if(p.action==="save") {
    if(!isUuid(p.runId)||!Number.isInteger(p.index)||Number(p.index)<0||Number(p.index)>9)return json({error:"Choose a valid research result."},400);
    const {data,error}=await call("save",p);return error?json({error:"The lead could not be saved."},400):json({lead:data});
  }
  if(p.action==="promote") {
    if(!isUuid(p.leadId)||!validSeedCommand({...p,action:"create"}))return json({error:"Enter a project name, contact name, verified email and brief."},400);
    const {data,error}=await call("promote",p);return error?json({error:"The seed could not be created."},503):json(data);
  }
  if(p.action!=="run"||!isUuid(p.submissionId)||!["search","website"].includes(String(p.mode))||typeof p.input!=="string"||p.input.trim().length<2||p.input.length>2048||/[\u0000-\u001f\u007f]/.test(p.input))return json({error:"Enter a public website or a business search."},400);
  if(!process.env.SGAI_API_KEY)return json({error:"Connect ScrapeGraphAI by adding the server secret SGAI_API_KEY to this Vercel project, then redeploy."},503);
  let input=p.input.trim();
  if(p.mode==="website") {try {input=normalizePublicResearchPage(input);}catch{return json({error:"Use a public HTTPS business website."},400);}}
  else if(input.length>300)return json({error:"Keep business searches under 300 characters."},400);
  const start=await call("begin",{...p,input});
  if(start.error)return json({error:"The run could not start. Two runs may already be in progress."},start.error.code==="40001"?409:503);
  if(!start.data.started)return json({run:start.data.run,reused:true});
  const runId=start.data.run.id; let results:LeadCandidate[]=[],errorCode:string|null=null,elapsedMs=0;
  const sgai=ScrapeGraphAI({apiKey:process.env.SGAI_API_KEY});
  try {
    if(p.mode==="search") {
      const result=await sgai.search({query:input,numResults:5,format:"markdown"});elapsedMs=result.elapsedMs;
      if(result.status!=="success"||!result.data)throw Error(result.error||"provider");
      results=result.data.results.map(item=>normalizeLead({name:item.title,website:item.url,summary:item.content},item.url)).filter((item):item is LeadCandidate=>!!item);
    } else {
      const session=createBoundedResearchSession(); let markdown:string;
      try {const page=await session.fetchPage(input);input=page.sourceUrl;const $=loadBuffer(Buffer.from(page.html));$("script,style,noscript,template,input,textarea,select,button,[hidden]").remove();markdown=$("body").text().replace(/\s+/g," ").trim().slice(0,64000);}
      catch {throw Error("source_denied");} finally {session.dispose();}
      const result=await sgai.extract({markdown,prompt:leadPrompt,schema:leadSchema});elapsedMs=result.elapsedMs;
      if(result.status!=="success"||!result.data)throw Error(result.error||"provider");
      const lead=normalizeLead(result.data.json,input);if(lead)results=[lead];
    }
  } catch(error) {
    const message=error instanceof Error?error.message:"";
    errorCode=message==="source_denied"?message:/API key|401/i.test(message)?"provider_auth":/credit|402/i.test(message)?"credits":/rate|429/i.test(message)?"rate_limit":/time|abort/i.test(message)?"timeout":"provider_error";
  }
  // Never retry a paid provider call automatically. Its persisted submission ID is reusable.
  const finish=await call("finish",{runId,results,errorCode,elapsedMs});
  return finish.error?json({error:"The provider returned, but saving the result failed. Check run history before starting again."},503):json({run:finish.data});
}
