export type OutreachProductKey = "emberweb" | "biosync";

export const outreachProducts = [
  {
    id: "emberweb",
    name: "EmberWeb websites & AI apps",
    summary: "Focused websites, customer request workflows and useful AI-assisted applications, scoped with the business.",
    capabilities: ["Websites and customer enquiry flows", "Booking and quote request workflows", "Internal dashboards and document workflows", "AI-assisted summaries with human review"],
    url: "https://emberweb.co.za/demo",
  },
  {
    id: "biosync",
    name: "BioSync Time & Attendance",
    summary: "Attendance reporting and workforce administration, with organization-scoped access and a mobile Rep Companion.",
    capabilities: ["Attendance dashboards and report exports", "Employee, leave, roster and shift management", "Scheduled reports and clock-data imports", "Mobile Rep Companion and payroll review workflows"],
    url: "https://app-biosync.co.za/login",
  },
] as const;

export function getOutreachProduct(key?: string | null) {
  return outreachProducts.find((product) => product.id === key) ?? outreachProducts[0];
}
