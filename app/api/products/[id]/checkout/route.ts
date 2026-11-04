import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanEmail, newAccessToken } from "@/lib/commerce";
import { hasPaidCreatorPlan } from "@/lib/creator-plan";
import { razorpayKeysFor } from "@/lib/payment-connections";
import { createOrder } from "@/lib/razorpay";
import { recoverPaidOrder } from "@/lib/paid-orders";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST { email, name? } — start buying a paid product. Creates a pending Order and a Razorpay
 * order on the CREATOR's own account (creator-owned payments), and returns what Razorpay
 * Checkout needs. The amount always comes from the product, never the client.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; name?: unknown };
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
  const [planOk, keys, seller] = await Promise.all([
    hasPaidCreatorPlan(product.userId),
    razorpayKeysFor(product.userId),
    prisma.user.findUnique({ where: { id: product.userId }, select: { name: true, username: true } }),
  ]);
  if (!planOk || !keys) return NextResponse.json({ error: "This product isn't on sale right now. Try again later." }, { status: 409 });

  // Paid before but the confirmation never arrived (tab closed)? Hand back the link, don't charge again.
  const recovered = await recoverPaidOrder(keys, product.id, email);
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
      provider: "razorpay",
      accessToken: newAccessToken(),
    },
  });
  try {
    const rp = await createOrder(keys, {
      amount: product.priceCents,
      currency: product.currency,
      receipt: order.id,
      notes: { kitevo_order_id: order.id, kitevo_product_id: product.id },
    });
    await prisma.order.update({ where: { id: order.id }, data: { providerOrderId: rp.id } });
    return NextResponse.json({
      provider: "razorpay",
      orderId: order.id,
      keyId: keys.keyId,
      razorpayOrderId: rp.id,
      amount: rp.amount,
      currency: rp.currency,
      productTitle: product.title,
      sellerName: seller?.name || seller?.username || "Creator",
      prefill: { email, name: name ?? undefined },
    });
  } catch (e) {
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    console.error("[checkout] razorpay order failed:", e);
    return NextResponse.json({ error: "Couldn't start the payment. Try again in a moment." }, { status: 502 });
  }
}
