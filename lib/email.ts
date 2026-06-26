import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "Media Kit Pro <noreply@mediakitpro.co>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/api/auth/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your email — Media Kit Pro",
    html: emailHtml({
      heading: "Verify your email",
      body: "Click the button below to verify your email address and activate your account. This link expires in 24 hours.",
      ctaLabel: "Verify email",
      ctaUrl: url,
      footer: "If you didn't create an account, you can safely ignore this email.",
    }),
  });
}

export async function sendInquiryNotification({
  ownerEmail,
  ownerName,
  kitName,
  kitSlug,
  from,
}: {
  ownerEmail: string;
  ownerName: string;
  kitName: string;
  kitSlug: string;
  from: { name: string; email: string; company?: string | null; message: string };
}) {
  const dashboardUrl = `${APP_URL}/dashboard`;
  const company = from.company ? ` (${from.company})` : "";
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `New inquiry on your kit "${kitName}" — Media Kit Pro`,
    html: emailHtml({
      heading: `New inquiry on "${kitName}"`,
      body: `<strong>${from.name}${company}</strong> &lt;${from.email}&gt; sent you a message:<br><br><blockquote style="margin:0;padding:12px 16px;border-left:3px solid #e8e4e0;color:#6b6560;font-style:italic">${from.message.replace(/\n/g, "<br>")}</blockquote><br>Reply directly to <a href="mailto:${from.email}" style="color:#111110">${from.email}</a>.`,
      ctaLabel: "View dashboard",
      ctaUrl: dashboardUrl,
      footer: `You received this because someone submitted an inquiry on your ${kitName} media kit. To stop these emails, contact us at hello@mediakitpro.co.`,
    }),
    replyTo: from.email,
  });
}

export async function sendViewMilestoneEmail({
  ownerEmail,
  ownerName,
  kitName,
  milestone,
}: {
  ownerEmail: string;
  ownerName: string;
  kitName: string;
  milestone: number;
}) {
  const dashboardUrl = `${APP_URL}/dashboard`;
  const milestoneFormatted = milestone >= 1000 ? `${milestone / 1000}k` : String(milestone);
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Your kit "${kitName}" just hit ${milestoneFormatted} views 🎉`,
    html: emailHtml({
      heading: `${milestoneFormatted} views on "${kitName}"`,
      body: `Your media kit just crossed <strong>${milestone.toLocaleString()} views</strong>. Brands and agencies are noticing you — keep sharing your kit link to grow your reach.`,
      ctaLabel: "View your analytics",
      ctaUrl: dashboardUrl,
      footer: `You received this because your kit hit a view milestone. To stop these emails, contact us at hello@mediakitpro.co.`,
    }),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your password — Media Kit Pro",
    html: emailHtml({
      heading: "Reset your password",
      body: "Click the button below to set a new password. This link expires in 1 hour.",
      ctaLabel: "Reset password",
      ctaUrl: url,
      footer: "If you didn't request a password reset, you can safely ignore this email.",
    }),
  });
}

function emailHtml({ heading, body, ctaLabel, ctaUrl, footer }: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
        <!-- Logo -->
        <tr><td style="padding-bottom:32px">
          <span style="font-size:18px;font-weight:600;color:#111110;letter-spacing:-0.02em">Media Kit Pro</span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;padding:40px;border:1px solid #e8e4e0">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#111110;letter-spacing:-0.02em">${heading}</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#6b6560;line-height:1.6">${body}</p>
          <a href="${ctaUrl}" style="display:inline-block;background:#111110;color:#f5f3f0;text-decoration:none;padding:12px 28px;border-radius:100px;font-size:14px;font-weight:600;letter-spacing:-0.01em">${ctaLabel}</a>
          <p style="margin:24px 0 0;font-size:12px;color:#9a9a98">Or copy this link: <a href="${ctaUrl}" style="color:#111110;word-break:break-all">${ctaUrl}</a></p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:24px">
          <p style="margin:0;font-size:12px;color:#a3a3a3;line-height:1.5">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
