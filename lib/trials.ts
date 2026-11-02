import { prisma } from "@/lib/prisma";

/**
 * Free-trial rules. One place decides eligibility; the checkout route enforces it (the UI
 * only uses it to choose a button label, never as the gate).
 *
 * Abuse limits:
 *  - One trial per account: anyone who has ever had a payment-provider customer record is
 *    ineligible. That record is written on the first completed checkout (trial or paid) and
 *    is never cleared, so cancelling mid-trial doesn't earn a second one. No extra column needed.
 *  - Verified email only, so throwaway signups can't farm trials.
 *  - A card is collected at checkout (explicit on Stripe; Dodo's checkout requires a payment
 *    method for subscriptions), and the provider bills automatically when the trial ends.
 */

/** Only Pro is trialable (PLAN.md: "14-day Pro trial"). */
export const TRIAL_TIER = "pro";

/** Trial length; PRO_TRIAL_DAYS=0 turns trials off. Clamped to a sane range. */
export function trialDays(): number {
  const raw = process.env.PRO_TRIAL_DAYS;
  if (raw === undefined || raw === "") return 14;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 30);
}

export type TrialEligibility =
  | { eligible: true; days: number }
  | { eligible: false; days: number; reason: "disabled" | "not_found" | "brand" | "unverified" | "used" | "comped" };

export async function getTrialEligibility(userId: string): Promise<TrialEligibility> {
  const days = trialDays();
  if (days === 0) return { eligible: false, days, reason: "disabled" };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountType: true, emailVerified: true, stripeCustomerId: true, compedTier: true },
  });
  if (!user) return { eligible: false, days, reason: "not_found" };
  if (user.accountType === "brand") return { eligible: false, days, reason: "brand" };
  if (!user.emailVerified) return { eligible: false, days, reason: "unverified" };
  if (user.stripeCustomerId) return { eligible: false, days, reason: "used" };
  if (user.compedTier === TRIAL_TIER) return { eligible: false, days, reason: "comped" };
  return { eligible: true, days };
}

/**
 * Discount codes are created and limited (expiry, max redemptions, first-time only) in the
 * payment provider's dashboard; we only pass a code through. Anything that doesn't look like
 * a code is dropped rather than sent to the provider.
 */
export function cleanDiscountCode(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code) ? code : undefined;
}
