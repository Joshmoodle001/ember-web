import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin";
import LeadResearchWorkspace from "@/components/lead-research-workspace";
export default async function LeadsPage(){const auth=await requireSuperAdmin();if(!auth.ok)redirect("/admin");return <LeadResearchWorkspace/>;}
