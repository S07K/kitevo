import { payments } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { getSubscriptionCustomerId } from "@/lib/subscription-cookie";
import { getKitsAllowedForPriceId } from "@/config/subscriptions";

async function allowedKitsForCustomer(customerId: string): Promise<number> {
  const sub = await payments.getSubscription(customerId, { activeOnly: true });
  if (!sub) return 0;
  return getKitsAllowedForPriceId(sub.priceId);
}

/** Get allowed kits for a logged-in user (uses stripeCustomerId from DB). Free tier = 1 kit. */
export async function getAllowedKitsForUser(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return 1; // Free tier default
  const paid = await allowedKitsForCustomer(user.stripeCustomerId);
  return paid > 0 ? paid : 1; // Fall back to free tier if subscription lapsed
}

/** Get allowed kits for the subscription tied to the request cookie (legacy / no session). */
export async function getAllowedKitsForCookie(cookieHeader: string | null): Promise<number> {
  const customerId = getSubscriptionCustomerId(cookieHeader);
  if (!customerId) return 0;
  return allowedKitsForCustomer(customerId);
}
