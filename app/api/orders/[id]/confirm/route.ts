import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { razorpayKeysFor } from "@/lib/payment-connections";
import { capturePayment, fetchPayment, verifyPaymentSignature } from "@/lib/razorpay";
import { markOrderPaid, orderAccessUrl } from "@/lib/paid-orders";

export const dynamic = "force-dynamic";

/**
 * POST { razorpay_payment_id, razorpay_order_id, razorpay_signature } — Razorpay Checkout's
 * success handler posts here. The order is marked paid only after (1) the signature checks
 * out with the creator's secret and (2) the payment, fetched from Razorpay, matches this
 * order's amount, currency and Razorpay order, and is captured (captured here if only
 * authorized). Idempotent: an already-paid order just returns its delivery link.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const rpOrderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";

  const order = await prisma.order.findUnique({ where: { id }, include: { product: true } });
  if (!order || order.provider !== "razorpay" || !order.providerOrderId) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const accessUrl = orderAccessUrl(order.accessToken);
  if (order.status === "paid") return NextResponse.json({ accessUrl });
  if (order.status !== "pending" || rpOrderId !== order.providerOrderId) return NextResponse.json({ error: "This payment doesn't match the order." }, { status: 400 });

  const keys = await razorpayKeysFor(order.sellerId);
  if (!keys) return NextResponse.json({ error: "The creator's payment account isn't connected. Contact them with your payment id." }, { status: 409 });
  if (!verifyPaymentSignature({ orderId: order.providerOrderId, paymentId, signature, keySecret: keys.keySecret })) {
    return NextResponse.json({ error: "We couldn't verify this payment." }, { status: 400 });
  }

  try {
    let payment = await fetchPayment(keys, paymentId);
    if (payment.order_id !== order.providerOrderId || payment.amount !== order.amountCents || payment.currency !== order.currency) {
      return NextResponse.json({ error: "This payment doesn't match the order." }, { status: 400 });
    }
    if (payment.status === "authorized") payment = await capturePayment(keys, paymentId, order.amountCents, order.currency);
    if (payment.status !== "captured") return NextResponse.json({ error: "The payment hasn't completed yet. If you were charged, contact the creator with your payment id." }, { status: 402 });
  } catch (e) {
    console.error("[confirm] razorpay payment check failed:", e);
    return NextResponse.json({ error: "Couldn't confirm the payment with Razorpay. Refresh in a moment; you won't be charged twice." }, { status: 502 });
  }

  // Only the first confirmation flips the order (and sends the email).
  await markOrderPaid(order, paymentId);
  return NextResponse.json({ accessUrl });
}
