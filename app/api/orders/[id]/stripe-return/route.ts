import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";
import { stripeKeyFor } from "@/lib/payment-connections";
import { retrieveCheckoutSession, sessionPaysFor } from "@/lib/stripe-creator";
import { markOrderPaid, orderAccessUrl } from "@/lib/paid-orders";

export const dynamic = "force-dynamic";

/**
 * GET ?session_id=cs_… — where Stripe sends the buyer after paying. We never trust the URL:
 * the session is fetched from the creator's Stripe account and must be paid, for this order,
 * amount and currency. Then the order is marked paid (once) and the buyer lands on their
 * private download page. Idempotent: an already-paid order just redirects there.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
  const base = APP_URL.replace(/\/$/, "");
  const order = await prisma.order.findUnique({ where: { id }, include: { product: true } });
  if (!order || order.provider !== "stripe") return NextResponse.redirect(`${base}/`, 303);
  const back = (reason: string) => NextResponse.redirect(`${base}/p/${order.productId}?checkout=${reason}`, 303);
  if (order.status === "paid") return NextResponse.redirect(orderAccessUrl(order.accessToken), 303);
  if (order.status !== "pending" || !sessionId || sessionId !== order.providerOrderId) return back("mismatch");

  const key = await stripeKeyFor(order.sellerId);
  if (!key) return back("unavailable");
  try {
    const session = await retrieveCheckoutSession(key, sessionId);
    if (!sessionPaysFor(session, order)) return back(session.payment_status === "unpaid" ? "processing" : "mismatch");
    await markOrderPaid(order, session.payment_intent ?? session.id);
  } catch (e) {
    console.error("[stripe-return] session check failed:", e);
    return back("processing");
  }
  return NextResponse.redirect(orderAccessUrl(order.accessToken), 303);
}
