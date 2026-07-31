import { getTierById } from "@/config/subscriptions";

/**
 * Beta auto-comp.
 *
 * While `BETA_AUTO_COMP_TIER` names a valid tier (e.g. "pro"), every new signup is granted
 * that tier's entitlements for free — the same grant `scripts/comp-user.ts` applies by
 * hand, but automatic. Unset the env var at launch and new signups return to normal
 * (free until they subscribe). Existing users are untouched either way.
 *
 * Returns the fields to spread into a Prisma `user.create`, so each call site stays a
 * one-line spread. Empty object when the flag is off or invalid — never throws, because a
 * signup must not fail over a misconfigured beta flag.
 *
 * The comp is intentionally creator-tier oriented (the beta is creator-first). A brand who
 * signs up during beta would also receive it; harmless, since brands do not use kits, and
 * it is cleaned up the moment the flag is removed.
 */
export function betaCompFieldsForNewUser():
  | { compedTier: string; verifiedTier: string | null }
  | Record<string, never> {
  const raw = process.env.BETA_AUTO_COMP_TIER?.trim().toLowerCase();
  if (!raw) return {};

  const tier = getTierById(raw);
  if (!tier) {
    console.warn(
      `[beta-comp] BETA_AUTO_COMP_TIER="${raw}" is not a known tier id; new signups will NOT be comped.`
    );
    return {};
  }

  console.log(`[beta-comp] New signup auto-comped to "${tier.id}".`);
  // `?? null`: SubscriptionTier.verifiedTier is optional, and the create field is string | null.
  return { compedTier: tier.id, verifiedTier: tier.verifiedTier ?? null };
}
