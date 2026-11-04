import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";
import { cleanEmail, newAccessToken } from "@/lib/commerce";
import { hasPaidCreatorPlan } from "@/lib/creator-plan";
import { paypalCredsFor, razorpayKeysFor, stripeKeyFor } from "@/lib/payment-connections";
import { approvalUrl, createPayPalOrder, paypalSupports } from "@/lib/paypal-creator";
import { createOrder } from "@/lib/razorpay";
import { createCheckoutSession } from "@/lib/stripe-creator";
import { recoverPaidOrder } from "@/lib/paid-orders";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST { email, name?, provider? } — start buying a paid product on the CREATOR's own payment
 * account (creator-owned payments). The amount always comes from the product, never the client.
 *  - razorpay: pending Order + Razorpay order → returns what Razorpay Checkout needs.
 *  - stripe:   pending Order + Stripe Checkout Session → returns { redirectUrl } (Stripe-hosted page).
 * `provider` picks between connected accounts; omitted → the only one connected (Razorpay first).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; name?: unknown; provider?: unknown };
  const email = cleanEmail(body.email);
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : null;

  const ip = rateLimit(`checkout:ip:${clientIp(req)}`, 10, 10 * 60 * 1000);
  if (!ip.ok) return NextResponse.json({ error: "Too many tries. Wait a few minutes and try again." }, { status: 429 });

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.status !== "published" || product.priceCents <= 0 || !product.deliveryUrl) {
    return NextResponse.json({ error: "This product isn't for sale." }, { status: 404 });
  }
  // Checked again at purchase time: a lapsed plan or a disconnected account stops sales.
  const [planOk, rpKeys, stripeKey, ppAll, seller] = await Promise.all([
    hasPaidCreatorPlan(product.userId),
    razorpayKeysFor(product.userId),
    stripeKeyFor(product.userId),
    paypalCredsFor(product.userId),
    prisma.user.findUnique({ where: { id: product.userId }, select: { name: true, username: true } }),
  ]);
  // PayPal only for currencies it supports (no INR).
  const ppCreds = ppAll && paypalSupports(product.currency) ? ppAll : null;
  const available = { razorpay: !!rpKeys, stripe: !!stripeKey, paypal: !!ppCreds };
  const wanted = body.provider === "stripe" || body.provider === "razorpay" || body.provider === "paypal" ? body.provider : null;
  const provider = wanted ? (available[wanted] ? wanted : null) : available.razorpay ? "razorpay" : available.stripe ? "stripe" : available.paypal ? "paypal" : null;
  if (!planOk || !provider) return NextResponse.json({ error: "This product isn't on sale right now. Try again later." }, { status: 409 });

  // Paid before but the confirmation never arrived (tab closed)? Hand back the link, don't charge again.
  const recovered = await recoverPaidOrder({ razorpay: rpKeys, stripe: stripeKey, paypal: ppCreds }, product.id, email);
  if (recovered) return NextResponse.json({ alreadyPaid: true, accessUrl: recovered });

  const order = await prisma.order.create({
    data: {
      productId: product.id,
      sellerId: product.userId,
      buyerEmail: email,
      buyerName: name,
      amountCents: product.priceCents,
      currency: product.currency,
      status: "pending",
      provider,
      accessToken: newAccessToken(),
    },
  });
  try {
    if (provider === "paypal") {
      const base = APP_URL.replace(/\/$/, "");
      const pp = await createPayPalOrder(ppCreds!, {
        orderId: order.id,
        title: product.title,
        amount: product.priceCents,
        currency: product.currency,
        brandName: seller?.name || seller?.username || "Creator",
        // PayPal appends ?token=<paypal order id>&PayerID=… on the way back.
        returnUrl: `${base}/api/orders/${order.id}/paypal-return`,
        cancelUrl: `${base}/p/${product.id}?checkout=cancelled`,
      });
      const href = approvalUrl(pp);
      if (!href) throw new Error("PayPal returned no approval link");
      await prisma.order.update({ where: { id: order.id }, data: { providerOrderId: pp.id } });
      return NextResponse.json({ provider: "paypal", orderId: order.id, redirectUrl: href });
    }
    if (provider === "stripe") {
      const base = APP_URL.replace(/\/$/, "");
      const session = await createCheckoutSession(stripeKey!, {
        orderId: order.id,
        productId: product.id,
        title: product.title,
        amount: product.priceCents,
        currency: product.currency,
        email,
        // {CHECKOUT_SESSION_ID} is filled in by Stripe on the way back.
        successUrl: `${base}/api/orders/${order.id}/stripe-return?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${base}/p/${product.id}?checkout=cancelled`,
      });
      if (!session.url) throw new Error("Stripe returned no checkout URL");
      await prisma.order.update({ where: { id: order.id }, data: { providerOrderId: session.id } });
      return NextResponse.json({ provider: "stripe", orderId: order.id, redirectUrl: session.url });
    }
    const rp = await createOrder(rpKeys!, {
      amount: product.priceCents,
      currency: product.currency,
      receipt: order.id,
      notes: { kitevo_order_id: order.id, kitevo_product_id: product.id },
    });
    await prisma.order.update({ where: { id: order.id }, data: { providerOrderId: rp.id } });
    return NextResponse.json({
      provider: "razorpay",
      orderId: order.id,
      keyId: rpKeys!.keyId,
      razorpayOrderId: rp.id,
      amount: rp.amount,
      currency: rp.currency,
      productTitle: product.title,
      sellerName: seller?.name || seller?.username || "Creator",
      prefill: { email, name: name ?? undefined },
    });
  } catch (e) {
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    console.error(`[checkout] ${provider} checkout failed:`, e);
    return NextResponse.json({ error: "Couldn't start the payment. Try again in a moment." }, { status: 502 });
  }
}
