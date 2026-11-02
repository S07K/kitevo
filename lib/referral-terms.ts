/**
 * Referral program terms — the single source of truth, client-safe (no server imports),
 * so marketing pages, the dashboard card and the ledger all quote the same numbers.
 */
import { getTierById } from "@/config/subscriptions";

export const REFERRAL_TERMS = {
  /** Commission rate in basis points (2000 = 20%). */
  rateBps: 2000,
  /** Commission is earned on the referred user's payments for this many months after their first one. */
  months: 12,
  /** Days a commission waits before it can be paid out (refund protection). */
  holdDays: 30,
  /** Minimum balance before a payout is due, in minor units per currency. */
  minPayout: { USD: 2500 } as Record<string, number>,
  defaultMinPayout: 2500,
} as const;

export const REFERRAL_RATE_PCT = REFERRAL_TERMS.rateBps / 100;

/**
 * Honest example earnings for marketing copy: what one referred creator on `tierId`
 * (monthly billing, pre-tax list price) earns the referrer over the commission window.
 * Upper bound — assumes they stay subscribed for the whole window.
 */
export function exampleEarnings(tierId: "starter" | "pro" = "pro") {
  const tier = getTierById(tierId);
  const monthly = tier?.priceMonthly ?? 0;
  const perMonth = (monthly * REFERRAL_TERMS.rateBps) / 10000;
  return { tierName: tier?.name ?? tierId, monthlyPrice: monthly, perMonth, perReferral: perMonth * REFERRAL_TERMS.months };
}
