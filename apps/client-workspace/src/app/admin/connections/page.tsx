import Link from "next/link";
import { getCalendarBookingUrl } from "@/lib/public-links";
import { isClientRegistrationEnabled } from "@/lib/client-registration";
import { isStaffEmailDeliveryConfigured } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default function ConnectionsPage() {
  const calendar = Boolean(getCalendarBookingUrl());
  const database = process.env.NEXT_PUBLIC_SUPABASE_URL === "https://hbdxhbwufgkrwqxpieds.supabase.co";
  const payments = Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY && process.env.PAYFAST_PASSPHRASE);
  const notificationEmail = isStaffEmailDeliveryConfigured();
  const lookup = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  const registration = isClientRegistrationEnabled(process.env.CLIENT_REGISTRATION_ENABLED);
  const connections = [
    { title: "Client accounts & data", status: database ? "EmberWeb project configured" : "Project configuration needs review", detail: "Business memberships control customer access. Public account creation is " + (registration ? "enabled; confirmation is required." : "paused until confirmation-email delivery is verified."), href: "/admin/clients", action: "Manage client access" },
    { title: "Appointments", status: calendar ? "Booking schedule configured" : "Booking schedule missing", detail: "The booking page opens the configured Google Calendar appointment schedule. This does not grant this app full access to your calendar.", href: "/book", action: "Open booking page" },
    { title: "PayFast", status: payments ? "Payment credentials configured" : "Payment credentials missing", detail: "Create agreed amounts manually in Finance. A credential check is not a test payment. Recurring billing is not enabled by the invoice workflow.", href: "/admin/finance", action: "Open invoices & payment history" },
    { title: "Request-detail emails", status: notificationEmail ? "Notification sender configured" : "Notification sender missing", detail: "Website enquiry emails use the notification outbox. This is separate from customer confirmation emails and from your personal email inbox.", href: "/admin/notifications", action: "Review notification deliveries" },
    { title: "Business research", status: lookup ? "Google lookup configured" : "Google lookup missing", detail: "Use Google business lookup and website checks to prepare opportunities. Research does not send outreach automatically.", href: "/admin/outreach", action: "Open research & outreach" },
    { title: "WhatsApp", status: "Reviewed draft handoff", detail: "Prepare a draft here, review it, then open WhatsApp and send it yourself. There is no persistent WhatsApp inbox or background message monitoring connected.", href: "/admin/outreach#whatsapp-desk", action: "Open WhatsApp review desk" },
    { title: "Your email inbox", status: "Not connected to this website", detail: "Receiving and replying to your Gmail inside this website needs a separate authorised mailbox connection. Notification sending does not provide mailbox access.", href: "/admin/outreach", action: "Prepare outreach drafts" },
    { title: "Sites, domains & traffic", status: "Published resource links available", detail: "Add approved site and app links to a client project. Automated deployment, domain renewal and traffic reporting need provider connections; no traffic figures are fabricated.", href: "/admin/clients", action: "Manage published project resources" },
  ];
  return <div className="workspace-page">
    <div className="page-heading"><div><p className="eyebrow">CONNECTIONS</p><h1>Your services, clearly connected.</h1><p className="muted">Configuration and available workflows. These checks do not send messages, charge a card or prove provider delivery.</p></div></div>
    <div className="connections-grid">{connections.map((connection) => <section className="panel connection-card" key={connection.title}><h2>{connection.title}</h2><p className="status-pill">{connection.status}</p><p className="muted">{connection.detail}</p><Link className="text-link" href={connection.href}>{connection.action} →</Link></section>)}</div>
  </div>;
}
