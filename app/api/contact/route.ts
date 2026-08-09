export const runtime = "edge";

type LeadPayload = {
  kind?: "project" | "audit";
  name?: string;
  business?: string;
  email?: string;
  phone?: string;
  need?: string;
  timing?: string;
  website?: string;
  focus?: string;
  notes?: string;
  company?: string;
};

const clean = (value: unknown, limit = 2000) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));

async function sendEmail(payload: Record<string, unknown>) {
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error("Email delivery failed");
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as LeadPayload;
    if (clean(input.company)) return Response.json({ ok: true });
    const name = clean(input.name, 120);
    const business = clean(input.business, 160);
    const email = clean(input.email, 160).toLowerCase();
    const kind = input.kind === "audit" ? "Audit request" : "Project brief";
    if (!name || !business || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Please complete the required fields." }, { status: 400 });
    if (!process.env.RESEND_API_KEY) return Response.json({ error: "Email service is not configured yet." }, { status: 503 });

    const fields = [["Name", name], ["Business", business], ["Email", email], ["Phone", clean(input.phone, 80)], ["Website", clean(input.website, 300)], ["Service needed", clean(input.need, 200)], ["Timing", clean(input.timing, 160)], ["Audit focus", clean(input.focus, 200)], ["Notes", clean(input.notes, 2000)]].filter(([, value]) => value);
    const rows = fields.map(([label, value]) => `<tr><td style="padding:8px 12px;color:#597075;font-size:12px;text-transform:uppercase">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#102a37">${escapeHtml(value)}</td></tr>`).join("");
    await sendEmail({ from: "EmberWeb <hello@send.emberweb.co.za>", to: ["info@emberweb.co.za"], reply_to: email, subject: `${kind}: ${business}`, html: `<div style="font-family:Arial,sans-serif;max-width:640px"><h1 style="background:#061a29;color:#c8fc37;padding:24px;margin:0">New EmberWeb ${kind.toLowerCase()}</h1><table style="width:100%;border-collapse:collapse;background:#f5f5ef">${rows}</table></div>` });
    await sendEmail({ from: "EmberWeb <hello@send.emberweb.co.za>", to: [email], subject: "We received your EmberWeb enquiry", html: `<div style="font-family:Arial,sans-serif;max-width:640px;color:#102a37"><div style="background:#061a29;padding:28px"><strong style="font-size:22px;color:#f5ecdf">EMBER<span style="color:#3de7ff">WEB</span></strong></div><div style="padding:28px;background:#f5ecdf"><h1 style="font-size:30px">Thanks, ${escapeHtml(name)}.</h1><p>We received your ${kind.toLowerCase()} for <strong>${escapeHtml(business)}</strong>. A real person will review it and get back to you shortly.</p><p>If something is urgent, WhatsApp us on <a href="https://wa.me/27825106642">082 510 6642</a>.</p></div></div>` });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "We could not send that just now. Please try again or WhatsApp us." }, { status: 500 });
  }
}
