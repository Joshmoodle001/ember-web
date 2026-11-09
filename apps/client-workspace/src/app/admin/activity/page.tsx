import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin";
import WorkspaceActivity from "@/components/workspace-activity";
export default async function ActivityPage(){const auth=await requireSuperAdmin();if(!auth.ok)redirect("/admin");return <WorkspaceActivity/>;}
