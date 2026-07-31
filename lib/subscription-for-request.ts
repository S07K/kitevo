import { payments } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { getSubscriptionCustomerId } from "@/lib/subscription-cookie";
import { getKitsAllowedForPriceId, getKitsAllowedForTier } from "@/config/subscriptions";

async function allowedKitsForCustomer(customerId: string): Promise<number> {
  const sub = await payments.getSubscription(customerId, { activeOnly: true });
  if (!sub) return 0;
  return getKitsAllowedForPriceId(sub.priceId);
}

/** Get allowed kits for a logged-in user. Highest of comp and subscription; free = 1. */
export async function getAllowedKitsForUser(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, compedTier: true },
  });

  // A comp grants its tier's kits with no external call. Take the best of comp and any
  // live subscription, so a real paid plan is never reduced by a lower comp.
  const comped = getKitsAllowedForTier(user?.compedTier ?? null);
  const paid = user?.stripeCustomerId ? await allowedKitsForCustomer(user.stripeCustomerId) : 0;
  const best = Math.max(comped, paid);
  return best > 0 ? best : 1; // Free tier default
}

/** Get allowed kits for the subscription tied to the request cookie (legacy / no session). */
export async function getAllowedKitsForCookie(cookieHeader: string | null): Promise<number> {
  const customerId = getSubscriptionCustomerId(cookieHeader);
  if (!customerId) return 0;
  return allowedKitsForCustomer(customerId);
}
