import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveStaffEmailSender } from "@/lib/staff-email-sender";

export async function sendPasswordSetup(email: string, invite = false) {
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.generateLink({ type: invite ? "invite" : "recovery", email });
  if (error || !data.user || !data.properties?.hashed_token) {
    if (!invite && ["user_not_found", "email_not_found"].includes(error?.code ?? "")) return { sent: false, userId: null };
    throw new Error("Password email could not be prepared.");
  }
  const from = resolveStaffEmailSender(process.env.RESEND_FROM_EMAIL);
  if (!from || !process.env.RESEND_API_KEY) throw new Error("Account email delivery is unavailable.");
  const link = new URL("/auth/callback", "https://portal.emberweb.co.za");
  link.searchParams.set("token_hash", data.properties.hashed_token);
  link.searchParams.set("type", invite ? "invite" : "recovery");
  link.searchParams.set("next", "/password");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: invite ? "Your EmberWeb workspace invitation" : "Create or reset your EmberWeb password", text: `Your private EmberWeb password link\n\nOpen the link below to verify your email and choose your own password:\n\n${link.href}\n\nThis link is single use and expires according to the account security settings. Do not forward it. EmberWeb staff cannot see the password you choose. If you did not request access or a reset, ignore this email.` }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Account email delivery could not be confirmed.");
  return { sent: true, userId: data.user.id };
}
