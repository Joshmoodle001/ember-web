import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { readLimitedText } from "@/lib/request-body";
import { clientResourceKinds, isUuid, safeClientResourceUrl } from "@/lib/client-account";
import { parseNewClient } from "@/lib/client-management";
const headers = { "Cache-Control": "private, no-store" };
function failure(message: string, status=400) { return NextResponse.json({ error: message }, { status, headers }); }
export async function GET() {
 const auth=await requireAdmin(); if(!auth.ok) return auth.response;
 const [clients,memberships,resources,projects]=await Promise.all([
 auth.supabase.from("clients").select("id,full_name,company,email").order("full_name"),
 auth.supabase.from("client_portal_memberships").select("id,client_id,user_id,active,created_at"),
 auth.supabase.from("client_project_resources").select("id,project_id,title,url,description,kind"),
 auth.supabase.from("projects").select("id,client_id,title")]);
 if([clients,memberships,resources,projects].some(r=>r.error)) return failure("Client access could not be loaded.",503);
 return NextResponse.json({clients:clients.data,memberships:memberships.data,resources:resources.data,projects:projects.data},{headers});
}
export async function POST(request: Request) {
 const auth=await requireAdmin(); if(!auth.ok) return auth.response;
 if(!hasAllowedStaffOrigin(request,true)) return failure("Request could not be completed.",403);
 let body: Record<string,unknown>;
 try { const parsed: unknown=JSON.parse(await readLimitedText(request,6000)); if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)) return failure("Invalid request."); body=parsed as Record<string,unknown>; } catch {return failure("Invalid request.");}
 if(body.action==="create_client") {
  const client = parseNewClient(body);
  if(!client) return failure("Enter a contact name, valid email and an optional business name within the allowed lengths.");
  const {data,error}=await auth.supabase.from("clients").insert(client).select("id").single();
  if(error || !data) return failure("The business record could not be created. Please check the client list before retrying.",503);
  return NextResponse.json({success:true,clientId:data.id,message:"Business record created. No login or client access has been granted."},{headers});
 } else if(body.action==="grant") {
  const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
  if(!isUuid(body.clientId)||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return failure("Choose a client and valid registered email.");
  const {data:client,error:clientError}=await auth.supabase.from("clients").select("id").eq("id",body.clientId).maybeSingle();
  if(clientError||!client) return failure("Client not found.",404);
  const service=createServiceClient(); let userId: string|null=null;
  for(let page=1;page<=20;page++) {const {data,error}=await service.auth.admin.listUsers({page,perPage:100}); if(error) return failure("Registered accounts could not be checked.",503); const user=data.users.find(u=>u.email?.toLowerCase()===email&&u.email_confirmed_at); if(user){userId=user.id;break;} if(data.users.length<100)break;}
  if(!userId)return failure("Ask the client to register and confirm their email first. If already confirmed, contact the workspace owner.");
  const {error}=await auth.supabase.from("client_portal_memberships").upsert({client_id:body.clientId,user_id:userId,active:true},{onConflict:"client_id,user_id"});
  if(error)return failure("Access could not be granted.",503);
 } else if(body.action==="revoke") {
  if(!isUuid(body.membershipId))return failure("Choose an access record.");
  const {error}=await auth.supabase.from("client_portal_memberships").update({active:false}).eq("id",body.membershipId); if(error)return failure("Access could not be revoked.",503);
 } else if(body.action==="resource") {
  const title=typeof body.title==="string"?body.title.trim():""; const description=typeof body.description==="string"?body.description.trim():""; const url=safeClientResourceUrl(body.url);
  if(!isUuid(body.projectId)||title.length<2||title.length>180||description.length>2000||typeof body.kind!=="string"||!clientResourceKinds.has(body.kind)||!url)return failure("Choose a project, title, resource type and public HTTPS link.");
  const {error}=await auth.supabase.from("client_project_resources").insert({project_id:body.projectId,title,description,url,kind:body.kind}); if(error)return failure("Resource could not be published.",503);
 } else if(body.action==="remove_resource") {
  if(!isUuid(body.resourceId))return failure("Choose a resource."); const {error}=await auth.supabase.from("client_project_resources").delete().eq("id",body.resourceId); if(error)return failure("Resource could not be removed.",503);
 } else return failure("Choose a supported action.");
 return NextResponse.json({success:true},{headers});
}
