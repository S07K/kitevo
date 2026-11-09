import { Resend } from "resend";
import { APP_URL } from "@/lib/app-url";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Resend's shared sandbox sender. It only delivers to the Resend account's own verified
 * address, so leaving it in production means every user email is silently dropped.
 * scripts/vercel-build.cjs fails a production build if RESEND_FROM_EMAIL is unset.
 */
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

/**
 * Absolute, because email clients have no page to resolve a relative src against.
 * PNG, because Gmail and Outlook strip <svg> and Gmail blocks data: URIs in <img>.
 * Regenerate with `npx tsx scripts/generate-social-graphics.ts`.
 */
const LOGO_URL = `${APP_URL}/logo-email.png`;

/**
 * How long a verification link stays valid. Exported because three places depend on it
 * and must agree: the signup route, the resend route's per-email cooldown (which
 * recovers the issue time by subtracting this from the stored expiry), and the copy in
 * the verification email below, which tells the user "expires in 24 hours".
 */
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * How long a password-reset link stays valid. Same contract as the verify TTL: the
 * forgot-password route's per-email cooldown recovers a token's issue time by
 * subtracting this from the stored expiry, and the reset email says "expires in 1 hour".
 */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

type SendArgs = Parameters<typeof resend.emails.send>[0];

/**
 * Send, and throw if Resend refused.
 *
 * `resend.emails.send()` resolves with `{ data, error }` rather than throwing, so an
 * `await` alone silently discards every failure: a rejected send looks identical to a
 * delivered one. That is how a signup could report success while no verification email
 * was ever accepted — the caller's own `.catch()` never fired because nothing rejected.
 *
 * The most common rejection is a `from` address on a domain that is not verified in
 * Resend. We send from `mail.getkitevo.com`, so `hello@getkitevo.com` is refused even
 * though it looks right and passes the build guard.
 */
async function send(args: SendArgs, context: string): Promise<void> {
  const { error } = await resend.emails.send(args);
  if (error) {
    // Named so the failing template is obvious in the log, since these are usually
    // fire-and-forget at the call site.
    throw new Error(`[email:${context}] Resend rejected the send: ${error.message}`);
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/api/auth/verify-email?token=${token}`;
  await send({
    from: FROM,
    to: email,
    subject: "Verify your email · Kitevo",
    html: emailHtml({
      heading: "Verify your email",
      body: "Click the button below to verify your email address and activate your account. This link expires in 24 hours.",
      ctaLabel: "Verify email",
      ctaUrl: url,
      footer: "If you didn't create an account, you can safely ignore this email.",
    }),
  }, "verification");
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
  const pipelineUrl = `${APP_URL}/pipeline`;
  const company = from.company ? ` (${from.company})` : "";
  await send({
    from: FROM,
    to: ownerEmail,
    subject: `New inquiry on your kit "${kitName}" · Kitevo`,
    html: emailHtml({
      heading: `New inquiry on your brand kit: "${escapeHtml(kitName)}"`,
      // Everything from the inquiry form is visitor input: escape it before it goes in HTML.
      body: `<strong>${escapeHtml(from.name)}${escapeHtml(company)}</strong> &lt;${escapeHtml(from.email)}&gt; sent you a message:<br><br>${quote(from.message)}<br>Reply directly to <a href="mailto:${encodeURIComponent(from.email)}" style="color:#111110">${escapeHtml(from.email)}</a>.`,
      ctaLabel: "Open your pipeline",
      ctaUrl: pipelineUrl,
      footer: `You received this because someone submitted an inquiry on your ${escapeHtml(kitName)} media kit. To stop these emails, contact us via your dashboard.`,
    }),
    replyTo: from.email,
  }, "inquiry");
}

/** A visitor's message as an escaped, line-broken blockquote (trimmed to `max` characters). */
function quote(text: string, max = 2000): string {
  const t = text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
  return `<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #e8e4e0;color:#6b6560;font-style:italic">${escapeHtml(t).replace(/\n/g, "<br>")}</blockquote>`;
}

/** Brand: a creator applied to one of your campaigns. */
export async function sendApplicationReceivedEmail({
  brandEmail,
  campaignTitle,
  creator,
  pitch,
}: {
  brandEmail: string;
  campaignTitle: string;
  creator: { name: string; username: string | null };
  pitch: string | null;
}) {
  const who = escapeHtml(creator.name) + (creator.username ? ` <span style="color:#9a9a98">@${escapeHtml(creator.username)}</span>` : "");
  await send(
    {
      from: FROM,
      to: brandEmail,
      subject: `New application for "${campaignTitle}" · Kitevo`,
      html: emailHtml({
        heading: `New application for "${escapeHtml(campaignTitle)}"`,
        body: `<strong>${who}</strong> applied${pitch ? " with this pitch:<br><br>" + quote(pitch, 600) : "."}<br>Their media kit is linked from the application.`,
        ctaLabel: "Review applicants",
        ctaUrl: `${APP_URL}/campaigns`,
        footer: `You received this because you posted "${escapeHtml(campaignTitle)}" on Kitevo.`,
      }),
    },
    "application-received",
  );
}

/** Creator: the brand accepted or declined your application. */
export async function sendApplicationDecisionEmail({
  creatorEmail,
  campaignId,
  campaignTitle,
  brandName,
  decision,
}: {
  creatorEmail: string;
  campaignId: string;
  campaignTitle: string;
  brandName: string;
  decision: "accepted" | "rejected";
}) {
  const title = escapeHtml(campaignTitle);
  const brand = escapeHtml(brandName);
  const accepted = decision === "accepted";
  await send(
    {
      from: FROM,
      to: creatorEmail,
      subject: accepted ? `${brandName} accepted your application · Kitevo` : `An update on "${campaignTitle}" · Kitevo`,
      html: emailHtml({
        heading: accepted ? `${brand} accepted your application` : `An update on "${title}"`,
        body: accepted
          ? `Good news: ${brand} accepted your application for <strong>${title}</strong>. They'll reach out in your Kitevo messages to sort out the details.`
          : `${brand} went with other creators for <strong>${title}</strong> this time. New briefs open every week, and your kit is ready for the next one.`,
        ctaLabel: accepted ? "View the campaign" : "Browse open campaigns",
        ctaUrl: accepted ? `${APP_URL}/campaigns/${encodeURIComponent(campaignId)}` : `${APP_URL}/campaigns`,
        footer: `You received this because you applied to "${title}" on Kitevo.`,
      }),
    },
    "application-decision",
  );
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
  await send({
    from: FROM,
    to: ownerEmail,
    subject: `Your kit "${kitName}" just hit ${milestoneFormatted} views`,
    html: emailHtml({
      heading: `${milestoneFormatted} views on "${kitName}"`,
      body: `Your media kit just crossed <strong>${milestone.toLocaleString()} views</strong>. Brands and agencies are noticing you. Keep sharing your kit link to grow your reach.`,
      ctaLabel: "View your analytics",
      ctaUrl: dashboardUrl,
      footer: `You received this because your kit hit a view milestone. To stop these emails, contact us via your dashboard.`,
    }),
  }, "view-milestone");
}

export async function sendDeleteAccountCodeEmail(email: string, code: string): Promise<void> {
  await send({
    from: FROM,
    to: email,
    subject: "Your account deletion code · Kitevo",
    html: emailHtml({
      heading: "Confirm account deletion",
      body: `Your 6-digit confirmation code is:<br><br><span style="font-size:32px;font-weight:700;letter-spacing:0.12em;color:#111110">${code}</span><br><br>Enter this code to permanently delete your account. It expires in <strong>15 minutes</strong>.<br><br>If you did not request this, your account is safe. Just ignore this email.`,
      ctaLabel: "Go to Kitevo",
      ctaUrl: APP_URL,
      footer: "This code was requested from the account settings page. Do not share it with anyone.",
    }),
  }, "delete-account");
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await send({
    from: FROM,
    to: email,
    subject: "Reset your password · Kitevo",
    html: emailHtml({
      heading: "Reset your password",
      body: "Click the button below to set a new password. This link expires in 1 hour.",
      ctaLabel: "Reset password",
      ctaUrl: url,
      footer: "If you didn't request a password reset, you can safely ignore this email.",
    }),
  }, "password-reset");
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

/** Receipt to a referrer after the admin records a payout. */
export async function sendReferralPayoutReceipt({
  email,
  name,
  amount,
  currency,
  reference,
}: {
  email: string;
  name: string | null;
  amount: number;
  currency: string;
  reference: string;
}) {
  await send({
    from: FROM,
    to: email,
    subject: `You've been paid ${money(amount, currency)} in referral earnings · Kitevo`,
    html: emailHtml({
      heading: `${money(amount, currency)} is on its way`,
      body: `Hi ${escapeHtml(name ?? "there")}, we've sent your Kitevo referral earnings of <strong>${money(amount, currency)}</strong> to the payout account in your settings.<br><br>Reference: <strong>${escapeHtml(reference)}</strong>. Depending on the method it can take a few days to arrive.`,
      ctaLabel: "See your earnings",
      ctaUrl: `${APP_URL}/referrals`,
      footer: "You received this because you referred creators to Kitevo.",
    }),
  }, "referral-payout");
}

/** Monthly heads-up to the admin that referral payouts are due. */
export async function sendPayoutsDueDigest({
  to,
  totals,
  payableCount,
  missingDetailsCount,
}: {
  to: string[];
  totals: Record<string, number>;
  payableCount: number;
  missingDetailsCount: number;
}) {
  const totalText = Object.entries(totals).map(([c, a]) => money(a, c)).join(" + ") || "nothing";
  await send({
    from: FROM,
    to,
    subject: `Referral payouts due: ${totalText} to ${payableCount} referrer${payableCount === 1 ? "" : "s"}`,
    html: emailHtml({
      heading: `${totalText} due to ${payableCount} referrer${payableCount === 1 ? "" : "s"}`,
      body: `Open the payouts page, send each payment in PayPal, Wise or your bank, then mark them paid with the reference.${missingDetailsCount ? `<br><br>${missingDetailsCount} more referrer${missingDetailsCount === 1 ? " is" : "s are"} over the minimum but haven't added payout details yet.` : ""}`,
      ctaLabel: "Review payouts",
      ctaUrl: `${APP_URL}/admin/payouts`,
      footer: "Sent on the 1st of each month while referral payouts are due.",
    }),
  }, "payouts-digest");
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
        <!-- Logo. Table cells, not flex/gap: Outlook supports neither.
             alt="" is deliberate — the wordmark beside it already says "Kitevo", and when a
             client blocks images this degrades to the wordmark alone rather than to the
             word twice. -->
        <tr><td style="padding-bottom:32px">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:8px;line-height:0">
              <img src="${LOGO_URL}" width="22" height="22" alt="" style="display:block;border:0;outline:none;text-decoration:none">
            </td>
            <td style="line-height:1">
              <span style="font-size:18px;font-weight:600;color:#111110;letter-spacing:-0.02em">Kitevo</span>
            </td>
          </tr></table>
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

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Buyer: your free download from a creator's kit (product + private delivery page link). */
export async function sendDownloadEmail({
  to,
  productTitle,
  creatorName,
  accessUrl,
  paidAmount,
  paidVia = "Razorpay",
}: {
  to: string;
  productTitle: string;
  creatorName: string;
  accessUrl: string;
  /** Set for purchases, e.g. "₹499": the email then reads as a receipt. */
  paidAmount?: string;
  /** Who processed the payment, for the receipt line ("Razorpay", "Stripe"). */
  paidVia?: string;
}) {
  await send(
    {
      from: FROM,
      to,
      subject: paidAmount ? `Your purchase: ${productTitle}` : `Your download: ${productTitle}`,
      html: emailHtml({
        heading: escapeHtml(productTitle),
        body: paidAmount
          ? `Thanks for your purchase from <strong>${escapeHtml(creatorName)}</strong> (${escapeHtml(paidAmount)}, paid to ${escapeHtml(creatorName)} through ${escapeHtml(paidVia)}). Keep this email: the link is yours and works any time.`
          : `Thanks for signing up. Here's your download from <strong>${escapeHtml(creatorName)}</strong>. Keep this email: the link is yours and works any time.`,
        ctaLabel: "Open your download",
        ctaUrl: accessUrl,
        footer: `You received this because you entered this address on ${escapeHtml(creatorName)}'s media kit on Kitevo. ${escapeHtml(creatorName)} can see that you signed up.`,
      }),
    },
    "download",
  );
}

/**
 * Brand deals: one template for every step (quote, counter, accepted, payment due, paid,
 * delivered). `lines` are plain text (escaped here); the link opens the deal.
 */
export async function sendDealEmail({ to, subject, heading, lines, ctaLabel, ctaUrl }: { to: string; subject: string; heading: string; lines: string[]; ctaLabel: string; ctaUrl: string }) {
  await send(
    {
      from: FROM,
      to,
      subject,
      html: emailHtml({
        heading: escapeHtml(heading),
        body: lines.map((l) => escapeHtml(l)).join("<br><br>"),
        ctaLabel,
        ctaUrl,
        footer: "You received this because you're part of a brand deal on Kitevo. Payments go straight to the creator; Kitevo never holds the money.",
      }),
    },
    "deal",
  );
}

/** New report → every ADMIN_EMAILS address. Carries no reporter text (the note stays in /admin). */
export async function sendReportAlert(reportId: string, reason: string) {
  const to = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (!to.length) return;
  const { reasonLabel } = await import("@/lib/safety-shared");
  await send(
    {
      from: FROM,
      to,
      subject: `New report: ${reasonLabel(reason)}`,
      html: emailHtml({
        heading: "Someone reported an account",
        body: `Reason: ${escapeHtml(reasonLabel(reason))}.<br><br>Review it in the admin reports queue, where you can dismiss it or suspend the account.`,
        ctaLabel: "Open reports",
        ctaUrl: `${APP_URL}/admin/reports#${encodeURIComponent(reportId)}`,
        footer: "Sent to Kitevo admins for every new report.",
      }),
    },
    "report-alert",
  );
}
