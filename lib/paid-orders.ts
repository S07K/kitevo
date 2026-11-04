import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";
import { formatPrice } from "@/lib/commerce-shared";
import { inBackground } from "@/lib/background";
import { sendDownloadEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";
import { fetchOrderPayments, type RazorpayKeys } from "@/lib/razorpay";
import { retrieveCheckoutSession, sessionPaysFor } from "@/lib/stripe-creator";
import { capturePayPalOrder, getPayPalOrder, paypalPaysFor, type PayPalCreds } from "@/lib/paypal-creator";

export function orderAccessUrl(accessToken: string) {
  return `${APP_URL.replace(/\/$/, "")}/o/${accessToken}`;
}

/**
 * Flip a pending order to paid. Only the first caller wins (conditional update), and only that
 * caller sends the purchase email, so concurrent confirmations can't double-send.
 */
const PROVIDER_NAMES: Record<string, string> = { razorpay: "Razorpay", stripe: "Stripe", paypal: "PayPal" };

export async function markOrderPaid(
  order: { id: string; sellerId: string; productId: string; buyerEmail: string; accessToken: string; amountCents: number; currency: string; provider?: string | null; product: { title: string } },
  paymentId: string,
) {
  const flipped = await prisma.order.updateMany({ where: { id: order.id, status: "pending" }, data: { status: "paid", providerRef: paymentId } });
  if (flipped.count !== 1) return false;
  const seller = await prisma.user.findUnique({ where: { id: order.sellerId }, select: { name: true, username: true } });
  const creatorName = seller?.name || seller?.username || "the creator";
  const accessUrl = orderAccessUrl(order.accessToken);
  const provider = order.provider ?? "razorpay";
  inBackground("purchase-email", () =>
    sendDownloadEmail({
      to: order.buyerEmail,
      productTitle: order.product.title,
      creatorName,
      accessUrl,
      paidAmount: formatPrice(order.amountCents, order.currency),
      paidVia: PROVIDER_NAMES[provider] ?? "the creator's payment provider",
    }),
  );
  void trackEvent("product_purchased", { userId: order.sellerId, props: { productId: order.productId, provider } });
  return true;
}

/**
 * A buyer who paid but lost the confirmation (closed the tab, network drop) has a pending order
 * whose provider-side order/session is paid. When they start checkout again, find it, mark it
 * paid and hand back the link instead of charging twice. Returns the access URL, or null.
 */
export async function recoverPaidOrder(
  creds: { razorpay?: RazorpayKeys | null; stripe?: string | null; paypal?: PayPalCreds | null },
  productId: string,
  email: string,
): Promise<string | null> {
  const providers = [creds.razorpay ? "razorpay" : null, creds.stripe ? "stripe" : null, creds.paypal ? "paypal" : null].filter(Boolean) as string[];
  if (!providers.length) return null;
  const pending = await prisma.order.findMany({
    where: { productId, buyerEmail: email, status: "pending", provider: { in: providers }, providerOrderId: { not: null }, createdAt: { gte: new Date(Date.now() - 7 * 864e5) } },
    include: { product: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  for (const o of pending) {
    try {
      let paymentId: string | null = null;
      if (o.provider === "razorpay" && creds.razorpay) {
        paymentId = (await fetchOrderPayments(creds.razorpay, o.providerOrderId!)).find((p) => p.status === "captured" && p.amount === o.amountCents && p.currency === o.currency)?.id ?? null;
      } else if (o.provider === "stripe" && creds.stripe) {
        const s = await retrieveCheckoutSession(creds.stripe, o.providerOrderId!);
        paymentId = sessionPaysFor(s, o) ? (s.payment_intent ?? s.id) : null;
      } else if (o.provider === "paypal" && creds.paypal) {
        // Approved on PayPal but never captured (tab closed before returning): capture now.
        let pp = await getPayPalOrder(creds.paypal, o.providerOrderId!);
        if (pp.status === "APPROVED") pp = await capturePayPalOrder(creds.paypal, pp.id, o.id);
        paymentId = paypalPaysFor(pp, o);
      }
      if (paymentId) {
        await markOrderPaid(o, paymentId);
        return orderAccessUrl(o.accessToken);
      }
    } catch (e) {
      console.error("[checkout] recovery lookup failed:", e);
    }
  }
  return null;
}
