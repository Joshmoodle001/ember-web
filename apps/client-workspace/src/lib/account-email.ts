import "server-only";
import { prepareWorkspaceLink } from "@/lib/supabase/workspace-accounts";
import { resolveStaffEmailSender } from "@/lib/staff-email-sender";

export async function sendPasswordSetup(email: string, invite = false) {
  const prepared = await preparePasswordSetup(email, invite);
  if(!prepared) return {sent:false,userId:null};
  await prepared.deliver();
  return {sent:true,userId:prepared.userId};
}

export async function preparePasswordSetup(email: string, invite = false) {
  const prepared = await prepareWorkspaceLink(email, invite);
  if (!prepared) return null;
  const from = resolveStaffEmailSender(process.env.RESEND_FROM_EMAIL);
  if (!from || !process.env.RESEND_API_KEY) throw new Error("Account email delivery is unavailable.");
  const link = new URL("/auth/callback", "https://portal.emberweb.co.za");
  link.searchParams.set("token_hash", prepared.token);
  link.searchParams.set("type", prepared.type);
  link.searchParams.set("next", "/password");
  return { userId:prepared.id, async deliver() {
   const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: invite ? "Your EmberWeb workspace invitation" : "Create or reset your EmberWeb password", text: `Your private EmberWeb password link\n\nOpen the link below to verify your email and choose your own password:\n\n${link.href}\n\nThis link is single use and expires according to the account security settings. Do not forward it. EmberWeb staff cannot see the password you choose. If you did not request access or a reset, ignore this email.` }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Account email delivery could not be confirmed.");
  } };
}
