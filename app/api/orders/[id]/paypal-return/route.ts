import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";
import { paypalCredsFor } from "@/lib/payment-connections";
import { capturePayPalOrder, getPayPalOrder, paypalPaysFor } from "@/lib/paypal-creator";
import { markOrderPaid, orderAccessUrl } from "@/lib/paid-orders";

export const dynamic = "force-dynamic";

/**
 * GET ?token=<PayPal order id>&PayerID=… — where PayPal sends the buyer after approving.
 * The URL is never trusted: the PayPal order must be this order's, then it's captured on the
 * creator's account (idempotently) and must be COMPLETED for this amount and currency before
 * the order is marked paid. Idempotent: an already-paid order just redirects to its page.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ppId = new URL(req.url).searchParams.get("token") ?? "";
  const base = APP_URL.replace(/\/$/, "");
  const order = await prisma.order.findUnique({ where: { id }, include: { product: true } });
  if (!order || order.provider !== "paypal") return NextResponse.redirect(`${base}/`, 303);
  const back = (reason: string) => NextResponse.redirect(`${base}/p/${order.productId}?checkout=${reason}`, 303);
  if (order.status === "paid") return NextResponse.redirect(orderAccessUrl(order.accessToken), 303);
  if (order.status !== "pending" || !ppId || ppId !== order.providerOrderId) return back("mismatch");

  const creds = await paypalCredsFor(order.sellerId);
  if (!creds) return back("unavailable");
  try {
    let pp = await getPayPalOrder(creds, ppId);
    if (pp.status === "APPROVED") pp = await capturePayPalOrder(creds, ppId, order.id);
    const captureId = paypalPaysFor(pp, order);
    if (!captureId) return back(pp.status === "COMPLETED" ? "mismatch" : "processing");
    await markOrderPaid(order, captureId);
  } catch (e) {
    console.error("[paypal-return] capture failed:", e);
    return back("processing");
  }
  return NextResponse.redirect(orderAccessUrl(order.accessToken), 303);
}
