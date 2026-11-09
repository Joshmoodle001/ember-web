import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin";
import WorkspaceAccounts from "@/components/workspace-accounts";
export default async function AccountsPage(){const auth=await requireSuperAdmin();if(!auth.ok)redirect("/admin");return <WorkspaceAccounts/>;}
