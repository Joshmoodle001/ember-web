export interface NotificationPayload {
  to: string;
  toName: string;
  subject: string;
  type: "status_change" | "payment" | "invoice" | "welcome" | "project_update";
  data: {
    projectName?: string;
    oldStatus?: string;
    newStatus?: string;
    status?: string;
    amount?: string;
    invoiceNumber?: string;
    total?: string;
    portalUrl?: string;
    [key: string]: unknown;
  };
}

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
    console.log("[Notification] No email provider configured. Logging notification:", {
      to: payload.to,
      subject: payload.subject,
      type: payload.type,
    });
    return true;
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.FROM_EMAIL || "noreply@emberweb.co.za";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `Ember Web <${fromEmail}>`,
          to: [payload.to],
          subject: payload.subject,
          html: generateEmailHTML(payload),
        }),
      });
      return res.ok;
    } catch (e) {
      console.error("Resend email error:", e);
      return false;
    }
  }

  return true;
}

function generateEmailHTML(payload: NotificationPayload): string {
  const baseStyles = "font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; background: #04060e; color: #e8eaf6;";
  const cardStyles = "background: linear-gradient(135deg, rgba(10,14,26,0.9), rgba(7,11,21,0.95)); border: 1px solid #121a2e; border-radius: 12px; padding: 24px; margin: 16px 0;";
  const accentColor = "#00f0ff";

  let content = "";

  switch (payload.type) {
    case "status_change":
      content = `
        <h2 style="color: #f0f0f5; margin: 0 0 12px 0; font-size: 20px;">Project Status Updated</h2>
        <p style="color: #6b7394; margin: 0 0 8px 0;">Hi ${payload.toName},</p>
        <p style="color: #e8eaf6; margin: 0 0 16px 0;">Your project <strong>${payload.data.projectName}</strong> has been updated:</p>
        <div style="${cardStyles}">
          <p style="color: #6b7394; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">FROM</p>
          <p style="color: #f0f0f5; margin: 0 0 12px 0; font-size: 16px;">${payload.data.oldStatus || "N/A"}</p>
          <p style="color: #6b7394; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">TO</p>
          <p style="color: ${accentColor}; margin: 0; font-size: 18px; font-weight: bold;">${payload.data.newStatus}</p>
        </div>`;
      break;
    case "payment":
      content = `
        <h2 style="color: #f0f0f5; margin: 0 0 12px 0; font-size: 20px;">Payment ${payload.data.status === "complete" ? "Confirmed" : "Update"}</h2>
        <p style="color: #e8eaf6; margin: 0 0 16px 0;">Payment of <strong>R${payload.data.amount}</strong> for <strong>${payload.data.projectName || "services"}</strong> has been marked as <span style="color: ${accentColor};">${payload.data.status}</span>.</p>`;
      break;
    case "invoice":
      content = `
        <h2 style="color: #f0f0f5; margin: 0 0 12px 0; font-size: 20px;">New Invoice: ${payload.data.invoiceNumber}</h2>
        <p style="color: #e8eaf6; margin: 0 0 16px 0;">Invoice for <strong>R${payload.data.total}</strong> is now <span style="color: ${accentColor};">${payload.data.status}</span>.</p>`;
      break;
    case "welcome":
      content = `
        <h2 style="color: #f0f0f5; margin: 0 0 12px 0; font-size: 20px;">Welcome to Ember Web</h2>
        <p style="color: #e8eaf6; margin: 0 0 16px 0;">Hi ${payload.toName}, thanks for reaching out! We'll be in touch soon regarding your project.</p>`;
      break;
    default:
      content = `<p style="color: #e8eaf6;">${payload.subject}</p>`;
  }

  const portalLink = payload.data.portalUrl;
  if (portalLink) {
    content += `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${portalLink}" style="display: inline-block; background: linear-gradient(135deg, #00f0ff, #3b82f6); color: #04060e; padding: 12px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px;">View Your Portal</a>
      </div>`;
  }

  return `
    <div style="${baseStyles}">
      <div style="text-align: center; padding: 24px 0 16px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #00f0ff, #3b82f6); color: #04060e; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 18px;">EMBER</div>
      </div>
      <div style="${cardStyles}">${content}</div>
      <p style="color: #6b7394; font-size: 12px; text-align: center; margin-top: 24px;">Ember Web · Building the future, one pixel at a time.</p>
    </div>`;
}