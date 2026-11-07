export const outreachPricePlans = [
 { id: "launch-lite", name: "Launch Lite", onceOff: 1500, monthlyCare: 799, from: false },
 { id: "starter", name: "Starter", onceOff: 2500, monthlyCare: 999, from: false },
 { id: "business", name: "Business", onceOff: 4000, monthlyCare: 1250, from: false },
 { id: "growth", name: "Growth", onceOff: 6000, monthlyCare: 1500, from: true },
] as const;
export type OutreachPlanId = typeof outreachPricePlans[number]["id"];
export type OutreachOfferInput = { businessName: string; industry: string; productKey?: string; website: string; notes?: string };
const suggestions: Record<string, readonly string[]> = {
 services: ["A clear service area and service list", "A short, structured quote request", "A simple handover for owner follow-up"],
 beauty: ["A visual treatment and price menu", "A clear appointment request route", "Approved answers to common service questions"],
 hospitality: ["A clear rooms and facilities overview", "A direct availability enquiry", "Approved guest information and host handover"],
 retail: ["Easy-to-browse products or menus", "A structured order or stock enquiry", "A useful queue of requests for the team"],
 professional: ["Clear services and examples of work", "Guided client intake", "An agreed document and task handover"],
 general: ["A clear explanation of the business", "One easy customer enquiry action", "A practical way to review incoming requests"],
};
export const formatOfferRand = (value: number) => `R${value.toLocaleString("en-ZA")}`;
export function getOutreachOffer(input: OutreachOfferInput) {
 const biosync = input.productKey === "biosync";
 const laundry = /laundry|dryclean/i.test(input.businessName);
 return {
  biosync,
  qualification: input.website.trim() ? "Website recorded. Review its current experience before suggesting changes." : "No website recorded. Verify whether the business has an existing site before making that claim.",
  suggestions: biosync ? ["Review attendance reporting and clock-data sources", "Explore leave, roster and shift administration", "Discuss organisation access and payroll review requirements"] : laundry ? ["An approved laundry service and price menu", "A collection or quote request, if offered", "Order tracking and collection reminders to scope later"] : suggestions[input.industry] ?? suggestions.general,
 };
}
export function createOutreachOfferDraft(input: OutreachOfferInput, planId: OutreachPlanId = "launch-lite") {
 const offer=getOutreachOffer(input);
 const name=input.businessName.trim().replace(/\s+/g," ").slice(0,160)||"there";
 const scope=offer.suggestions.slice(0,2).map(item=>item.charAt(0).toLowerCase()+item.slice(1)).join(" and ");
 const plan=outreachPricePlans.find(item=>item.id===planId)??outreachPricePlans[0];
 const pricing=offer.biosync
  ? "BioSync pricing is quoted after we review your team size, data sources and requirements."
  : `An indicative ${plan.name} website starting point is ${plan.from?"from ":""}${formatOfferRand(plan.onceOff)} once-off, with EmberCare ${formatOfferRand(plan.monthlyCare)} per month as a separate ongoing service. Scope and third-party costs are confirmed in a proposal; prices exclude VAT where applicable. Apps, AI integrations and provider charges are quoted separately.`;
 return `Hi ${name}, it’s Josh from EmberWeb. Could we explore ${offer.biosync?"BioSync Time & Attendance":"a useful website starting point"} for your business? Possible discussion points are ${scope}. We would confirm what you actually need together.\n\n${pricing}\n\nIllustrative EmberWeb demo: https://emberweb.co.za/demo\nBook a conversation: https://emberweb.co.za/book\n\nIf this isn’t relevant, let me know and I won’t follow up.`;
}
