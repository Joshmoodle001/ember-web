import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import WorkspaceRuntime,{WorkspaceLogout} from "@/components/workspace-runtime";
import WorkspaceNavigation from "@/components/workspace-navigation";
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const auth=await requireAdmin();if(!auth.ok)redirect("/login");
 return <WorkspaceRuntime identity={auth.identity}><div className="control-shell"><div className="control-content"><header className="control-topbar"><a href="/admin" className="control-mobile-brand">EMBERWEB</a><span>{auth.identity.email}</span><WorkspaceNavigation role={auth.identity.role}/><WorkspaceLogout/></header><main className="control-main">{children}</main><footer className="control-footer">EmberWeb staff workspace · {auth.identity.role.replaceAll("_"," ")}</footer></div></div></WorkspaceRuntime>;
}
