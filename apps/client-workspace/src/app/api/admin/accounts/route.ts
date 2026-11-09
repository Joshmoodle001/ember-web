import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { readLimitedText } from "@/lib/request-body";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { preparePasswordSetup,sendPasswordSetup } from "@/lib/account-email";
import { logAccountEvent } from "@/lib/workspace-identity";
import { checkRateLimits } from "@/lib/rate-limit";
import { isUuid } from "@/lib/client-account";
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request){
 const auth=await requireSuperAdmin();if(!auth.ok)return auth.response;
 const page=Number(new URL(request.url).searchParams.get("page")??0);
 if(!Number.isSafeInteger(page)||page<0||page>10000)return NextResponse.json({error:"Invalid page."},{status:400,headers});
 const {data,error}=await createServiceClient().rpc("workspace_super_accounts",{p_actor_id:auth.user.id,p_page:page});
 return NextResponse.json(error?{error:"Accounts could not be loaded."}:data,{status:error?503:200,headers});
}
async function write(request:Request){
 const auth=await requireSuperAdmin();if(!auth.ok)return auth.response;
 if(!hasAllowedStaffOrigin(request,true))return NextResponse.json({error:"Request denied."},{status:403,headers});
 try{
  const p=JSON.parse(await readLimitedText(request,4000)),service=createServiceClient();
  if(!await checkRateLimits(service,[{scope:"accounts:manage",identity:auth.user.id,limit:30,windowSeconds:3600}]))return NextResponse.json({error:"Please wait before another account change."},{status:429,headers});
  if(request.method==="POST"){
   const email=typeof p.email==="string"?p.email.trim().toLowerCase():"";
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!["admin","client"].includes(p.role)||(p.role==="client"&&!isUuid(p.clientId)))return NextResponse.json({error:"Choose a valid email, role and client business."},{status:400,headers});
   const prepared=await preparePasswordSetup(email,true);
   if(!prepared)throw Error("Invitation unavailable.");
   const grant=await service.rpc("workspace_account_access",{p_actor_id:auth.user.id,p_target_id:prepared.userId,p_action:"grant",p_role:p.role,p_client_id:p.clientId??null});
   if(grant.error)throw Error("Access could not be granted.");
   await prepared.deliver();await logAccountEvent(auth.user.id,"account_invited",prepared.userId);
   return NextResponse.json({message:"Invitation sent. The recipient verifies their email and chooses their own password."},{status:201,headers});
  }
  if(!isUuid(p.id)||p.id===auth.user.id)return NextResponse.json({error:"The owner account cannot be changed here."},{status:403,headers});
  const target=await service.auth.admin.getUserById(p.id);
  if(target.error||!target.data.user||target.data.user.email?.toLowerCase()==="joshmoodley01@gmail.com")return NextResponse.json({error:"Account unavailable or protected."},{status:403,headers});
  if(request.method==="DELETE"){
   if(p.confirmEmail!==target.data.user.email)return NextResponse.json({error:"Enter the exact account email to confirm deletion."},{status:400,headers});
   const revoke=await service.rpc("workspace_account_access",{p_actor_id:auth.user.id,p_target_id:p.id,p_action:"revoke"});if(revoke.error)throw Error("Access could not be revoked.");
   const deleted=await service.auth.admin.deleteUser(p.id,true);if(deleted.error)throw Error("Access is revoked, but account deletion needs a retry.");
   await logAccountEvent(auth.user.id,"account_deleted",p.id);
   return NextResponse.json({message:"Account deleted and project access revoked. Audit history is retained."},{headers});
  }
  if(p.action==="reset"){
   await sendPasswordSetup(target.data.user.email!,!target.data.user.email_confirmed_at);await logAccountEvent(auth.user.id,"password_email_sent",p.id);
   return NextResponse.json({message:"Private password link sent. Passwords are never displayed to staff."},{headers});
  }
  if(p.action==="access"){
   if(!["admin","client","inactive"].includes(p.role)||(p.role==="client"&&!isUuid(p.clientId)))return NextResponse.json({error:"Choose a role and client business."},{status:400,headers});
   const change=await service.rpc("workspace_account_access",{p_actor_id:auth.user.id,p_target_id:p.id,p_action:p.role==="inactive"?"revoke":"grant",p_role:p.role,p_client_id:p.clientId??null});if(change.error)throw Error("Access could not be changed.");
   return NextResponse.json({message:"Account access updated."},{headers});
  }
  if(p.action!=="details"||typeof p.name!=="string"||p.name.length>160||typeof p.phone!=="string"||p.phone.length>40)return NextResponse.json({error:"Check the account details."},{status:400,headers});
  const changed=await service.auth.admin.updateUserById(p.id,{user_metadata:{...target.data.user.user_metadata,full_name:p.name.trim(),contact_phone:p.phone.trim()}});if(changed.error)throw Error("Account details could not be saved.");
  await logAccountEvent(auth.user.id,"account_details_changed",p.id);
  return NextResponse.json({message:"Account details updated."},{headers});
 }catch{return NextResponse.json({error:"The account change or email could not be completed. Refresh the account list before retrying; an invitation may already be pending."},{status:503,headers});}
}
export const POST=write;export const PATCH=write;export const DELETE=write;
