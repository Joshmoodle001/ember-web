import {redirect} from "next/navigation";
import {requireSuperAdmin} from "@/lib/admin";
import ClientAccessWorkspace from "@/components/client-access-workspace";
export default async function ClientAccessPage(){const auth=await requireSuperAdmin();if(!auth.ok)redirect("/admin");return <ClientAccessWorkspace/>;}
