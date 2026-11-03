import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";
import { formatPrice } from "@/lib/commerce-shared";
import { inBackground } from "@/lib/background";
import { sendDownloadEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";
import { fetchOrderPayments, type RazorpayKeys } from "@/lib/razorpay";

export function orderAccessUrl(accessToken: string) {
  return `${APP_URL.replace(/\/$/, "")}/o/${accessToken}`;
}

/**
 * Flip a pending order to paid. Only the first caller wins (conditional update), and only that
 * caller sends the purchase email, so concurrent confirmations can't double-send.
 */
export async function markOrderPaid(order: { id: string; sellerId: string; productId: string; buyerEmail: string; accessToken: string; amountCents: number; currency: string; product: { title: string } }, paymentId: string) {
  const flipped = await prisma.order.updateMany({ where: { id: order.id, status: "pending" }, data: { status: "paid", providerRef: paymentId } });
  if (flipped.count !== 1) return false;
  const seller = await prisma.user.findUnique({ where: { id: order.sellerId }, select: { name: true, username: true } });
  const creatorName = seller?.name || seller?.username || "the creator";
  const accessUrl = orderAccessUrl(order.accessToken);
  inBackground("purchase-email", () =>
    sendDownloadEmail({ to: order.buyerEmail, productTitle: order.product.title, creatorName, accessUrl, paidAmount: formatPrice(order.amountCents, order.currency) }),
  );
  void trackEvent("product_purchased", { userId: order.sellerId, props: { productId: order.productId, provider: "razorpay" } });
  return true;
}

/**
 * A buyer who paid but closed the tab before confirmation has a pending order whose Razorpay
 * order holds a captured payment. When they start checkout again, find it, mark it paid and
 * hand back the link instead of charging twice. Returns the access URL, or null.
 */
export async function recoverPaidOrder(keys: RazorpayKeys, productId: string, email: string): Promise<string | null> {
  const pending = await prisma.order.findMany({
    where: { productId, buyerEmail: email, status: "pending", provider: "razorpay", providerOrderId: { not: null }, createdAt: { gte: new Date(Date.now() - 7 * 864e5) } },
    include: { product: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  for (const o of pending) {
    try {
      const paid = (await fetchOrderPayments(keys, o.providerOrderId!)).find((p) => p.status === "captured" && p.amount === o.amountCents && p.currency === o.currency);
      if (paid) {
        await markOrderPaid(o, paid.id);
        return orderAccessUrl(o.accessToken);
      }
    } catch (e) {
      console.error("[checkout] recovery lookup failed:", e);
    }
  }
  return null;
}
