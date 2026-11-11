import type { WorkspaceRole } from "./workspace-model";

export const workspaceSections = [
  { id: "work", label: "Projects & support", items: [
    { href: "/admin/pipeline", label: "Enquiry pipeline", keywords: "seed allocate query onboarding" },
    { href: "/admin/projects", label: "Project delivery", keywords: "build stage progress agent" },
    { href: "/admin/requests", label: "Support tickets", keywords: "request change help" },
  ] },
  { id: "growth", label: "Leads & outreach", items: [
    { href: "/admin/leads", label: "Lead research", keywords: "scrapegraph search scrape prospect", owner: true },
    { href: "/admin/outreach", label: "Outreach studio", keywords: "campaign whatsapp contact" },
  ] },
  { id: "business", label: "Clients & business", items: [
    { href: "/admin/clients", label: "Client businesses & sites", keywords: "customer resources website onboarding", owner: true },
    { href: "/admin/proposals", label: "Proposals", keywords: "quote scope" },
    { href: "/admin/finance", label: "Invoices & payments", keywords: "billing money finance" },
    { href: "/admin/meetings", label: "Appointments", keywords: "book calendar meeting" },
    { href: "/admin/business", label: "Business records", keywords: "legacy enquiry overview" },
  ] },
  { id: "manage", label: "Workspace settings", items: [
    { href: "/admin/accounts", label: "People & access", keywords: "user password invite account role staff", owner: true },
    { href: "/admin/activity", label: "Activity & audit", keywords: "analytics log history changes", owner: true },
    { href: "/admin/notifications", label: "Notifications", keywords: "alerts email" },
    { href: "/admin/connections", label: "Connections", keywords: "integration settings provider" },
  ] },
] as const;

export function navigationSections(role: WorkspaceRole, query = "") {
  const search = query.trim().toLowerCase();
  return workspaceSections.map(section => ({ ...section, items: section.items.filter(item =>
    (!("owner" in item) || role === "super_admin") && (!search || `${section.label} ${item.label} ${item.keywords}`.toLowerCase().includes(search)),
  ) })).filter(section => section.items.length);
}

export function workspaceLocation(path: string) {
  if (path === "/admin") return { section: "Workspace", label: "Overview" };
  for (const section of workspaceSections) {
    const item = section.items.find(item => path === item.href || path.startsWith(`${item.href}/`));
    if (item) return { section: section.label, label: item.label };
  }
  return { section: "Workspace", label: "Business tools" };
}
