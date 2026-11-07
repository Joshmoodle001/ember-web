const fallbackSender = "EmberWeb <onboarding@resend.dev>";
const mailboxPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function resolveStaffEmailSender(configured: string | undefined): string | null {
  if (configured === undefined || configured.trim() === "") return fallbackSender;

  const mailbox = configured.trim();
  if (/[\u0000-\u001f\u007f]/.test(configured) || mailbox.length > 254 || mailbox.includes("..")) return null;
  const [localPart] = mailbox.split("@");
  if (!localPart || localPart.length > 64 || localPart.startsWith(".") || localPart.endsWith(".") || !mailboxPattern.test(mailbox)) return null;

  return `EmberWeb <${mailbox}>`;
}
