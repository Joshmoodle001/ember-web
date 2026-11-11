import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import WorkspaceRuntime,{WorkspaceLogout} from "@/components/workspace-runtime";
import WorkspaceNavigation,{WorkspaceLocation} from "@/components/workspace-navigation";
import "@/app/workspace-flow.css";
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const auth=await requireAdmin();if(!auth.ok)redirect("/login");
 return <WorkspaceRuntime identity={auth.identity}><a className="workspace-skip" href="#workspace-main">Skip to content</a><div className="control-shell"><div className="control-content"><header className="control-topbar"><WorkspaceNavigation role={auth.identity.role}/><WorkspaceLocation/><WorkspaceLogout/></header><main id="workspace-main" className="control-main" tabIndex={-1}>{children}</main><footer className="control-footer">EmberWeb · {auth.identity.email}</footer></div></div></WorkspaceRuntime>;
}
