import type { OutreachProductKey } from "./products";

export const industries = [
  { id: "services", label: "Trades & local services", headline: "A clearer route from enquiry to booked job.", need: "a quote request app with an AI enquiry assistant", features: ["Structured quote requests", "Enquiry summaries for the owner", "Booking and follow-up reminders"] },
  { id: "beauty", label: "Salons & wellness", headline: "Less back-and-forth. More time with clients.", need: "an appointment website with booking and service FAQs", features: ["Service and appointment finder", "Booking confirmations", "A simple client follow-up dashboard"] },
  { id: "hospitality", label: "Guesthouses & hospitality", headline: "Turn questions into confident booking enquiries.", need: "a guest enquiry assistant and direct-booking website", features: ["Room and experience enquiries", "Answers grounded in approved guest information", "A handover to the host when needed"] },
  { id: "retail", label: "Retail & restaurants", headline: "Make products, orders and next steps easy to find.", need: "a product discovery website and order enquiry app", features: ["Clear menus or product categories", "Order and stock enquiries", "A team dashboard for requests"] },
  { id: "professional", label: "Agencies & professional teams", headline: "A better first impression. A tidier workflow.", need: "a client intake portal and document workflow", features: ["Guided project intake", "Document and task tracking", "AI-assisted summaries reviewed by the team"] },
  { id: "general", label: "Other growing businesses", headline: "A useful website. Less repetitive admin.", need: "a focused website and customer request dashboard", features: ["One clear customer action", "Enquiry routing and summaries", "Bookings and a practical owner dashboard"] },
] as const;

export type IndustryId = typeof industries[number]["id"];
export type PermissionStatus = "unconfirmed" | "opted_in" | "existing_customer" | "do_not_contact";
export type ProspectStatus = "research" | "ready" | "contacted" | "replied" | "booked" | "closed";
export type Prospect = { id: string; product_key?: OutreachProductKey; business_name: string; industry: string; city: string; website: string; phone: string; email: string; notes: string; permission_status: PermissionStatus; permission_note: string; status: ProspectStatus; created_at: string; updated_at: string };
export type PreparedOutreach = { prospect_id: string; message: string; prepared_at: string; source_updated_at: string };
export type OutreachData = { prospects: Prospect[]; preparations: PreparedOutreach[]; lookupConfigured: boolean };

export function summarizeOutreach(prospects: Prospect[], preparations: PreparedOutreach[]) {
  const prepared = new Map(preparations.map((item) => [item.prospect_id, item.source_updated_at]));
  return {
    saved: prospects.length,
    draftsToReview: prospects.filter((item) => prepared.get(item.id) === item.updated_at
      && (item.status === "research" || item.status === "ready")
      && canPrepareWhatsApp(item.permission_status, item.permission_note)).length,
    replied: prospects.filter((item) => item.status === "replied").length,
    booked: prospects.filter((item) => item.status === "booked").length,
  };
}

export function getIndustry(id: string) {
  return industries.find((industry) => industry.id === id) ?? industries[5];
}

export function normalizeWhatsAppPhone(value: string): string | null {
  if (!/^[+\d\s().-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0")) digits = "27" + digits.slice(1);
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function canPrepareWhatsApp(permission: PermissionStatus, permissionNote: string) {
  return (permission === "opted_in" || permission === "existing_customer") && permissionNote.trim().length >= 10;
}

export function createWhatsAppDraft(business: string, industry: string, observation: string, productKey: OutreachProductKey = "emberweb") {
  const profile = getIndustry(industry);
  const name = business.trim().replace(/[\r\n]+/g, " ").slice(0, 160) || "your team";
  const note = observation.trim().slice(0, 500);
  if (productKey === "biosync") return `Hi ${name}, it’s Josh from EmberWeb. ${note ? note + " " : ""}If attendance reporting or workforce admin is something you’re reviewing, we could walk through BioSync Time & Attendance. It brings attendance reports, rosters, leave and a mobile Rep Companion into an organization-scoped workspace. We’d first check your requirements and data sources together.\n\nWould a short walkthrough be useful? Choose a time at https://emberweb.co.za/book. If this isn’t relevant, let me know and I won’t follow up.`;
  return `Hi ${name}, it’s Josh from EmberWeb. ${note ? note + " " : ""}One idea we could explore is ${profile.need}.\n\nI’ve put together a short illustrative demo: https://emberweb.co.za/demo\n\nWould a quick walkthrough be useful? You can choose a time at https://emberweb.co.za/book. If this isn’t relevant, let me know and I won’t follow up.`;
}

export function whatsappDraftUrl(phone: string, message: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  return normalized && message.trim().length > 0 && message.length <= 2000 ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : null;
}

export type WhatsAppHandoff = { appUrl: string | null; webUrl: string | null; reason: string | null };

/** Prepare a user-opened draft from the saved record; this never sends a message. */
export function getWhatsAppHandoff(
  saved: Prospect | undefined,
  unsavedChanges: boolean,
  reviewed: boolean,
  busy: boolean,
  message: string,
): WhatsAppHandoff {
  const blocked = (reason: string): WhatsAppHandoff => ({ appUrl: null, webUrl: null, reason });
  if (saved?.permission_status === "do_not_contact") return blocked("This business is marked do not contact. WhatsApp handoff is blocked.");
  if (!saved) return blocked("Choose a saved prospect before opening a WhatsApp draft.");
  if (unsavedChanges) return blocked("Save the business details and contact permission before opening WhatsApp.");
  if (busy) return blocked("Finish the current save or import before opening WhatsApp.");
  if (!canPrepareWhatsApp(saved.permission_status, saved.permission_note)) return blocked("Record and save the business's contact permission and supporting note first.");
  if (!reviewed) return blocked("Review the recipient, permission and message, then confirm your review.");
  const phone = normalizeWhatsAppPhone(saved.phone);
  if (!phone) return blocked("Verify and save a valid WhatsApp number. Research-note numbers are not used for messaging.");
  if (!message.trim() || message.length > 2000) return blocked("Write a message between 1 and 2,000 characters before opening WhatsApp.");
  try {
    return {
      appUrl: whatsappDraftUrl(saved.phone, message),
      webUrl: `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`,
      reason: null,
    };
  } catch {
    return blocked("The draft contains unsupported text. Retype the affected characters before opening WhatsApp.");
  }
}

/** Search saved contact fields only, with businesses lacking a website first. */
export function filterOutreachProspects(prospects: Prospect[], query: string, missingWebsiteOnly: boolean): Prospect[] {
  const text = query.trim().toLowerCase();
  const digits = /^[+\d\s().-]+$/.test(text) ? text.replace(/\D/g, "").replace(/^00/, "") : "";
  return prospects.filter((prospect) => {
    if (missingWebsiteOnly && prospect.website.trim()) return false;
    if (!text || prospect.business_name.toLowerCase().includes(text) || prospect.city.toLowerCase().includes(text)) return true;
    if (!digits) return false;
    const normalized = normalizeWhatsAppPhone(prospect.phone);
    const phoneValues = [prospect.phone.replace(/\D/g, ""), normalized ?? "", normalized?.startsWith("27") ? `0${normalized.slice(2)}` : ""];
    return phoneValues.some((phone) => phone.includes(digits));
  }).sort((first, second) => Number(Boolean(first.website.trim())) - Number(Boolean(second.website.trim())));
}
