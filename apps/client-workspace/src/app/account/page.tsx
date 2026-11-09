import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { workspaceIdentity } from "@/lib/workspace-identity";
import ClientDashboard from "@/components/client-dashboard";
import WorkspaceRuntime,{WorkspaceLogout} from "@/components/workspace-runtime";
export const metadata:Metadata={title:"Your projects | EmberWeb Client Portal",manifest:"/account/manifest.webmanifest",appleWebApp:{capable:true,title:"EmberWeb",statusBarStyle:"default"},icons:{apple:"/account/icon-192.png"}};
export default async function AccountPage(){
 const {data,error}=await(await createClient()).auth.getUser();
 if(error||!data.user?.email_confirmed_at)redirect("/login");
 const identity=await workspaceIdentity(data.user.id);
 if(!identity)redirect("/login?error=access");
 if(identity.role!=="client")redirect("/admin");
 return <WorkspaceRuntime identity={identity}><main className="account-shell client-workspace"><header className="account-top"><a className="brand" href="/account">EMBER<span>WEB</span></a><nav aria-label="Client workspace"><a href="/book">Book a meeting</a><WorkspaceLogout/></nav></header><section className="account-heading"><p className="eyebrow">YOUR CLIENT WORKSPACE</p><h1>Your projects.<br/>Your next steps.</h1><p className="account-note">Your sites, delivery updates and support conversations, together. Signed in as {identity.email}.</p></section><ClientDashboard/></main></WorkspaceRuntime>;
}
