import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { razorpayKeysFor } from "@/lib/payment-connections";
import { capturePayment, fetchPayment, verifyPaymentSignature } from "@/lib/razorpay";
import { markDealPaymentPaid } from "@/lib/deals";

export const dynamic = "force-dynamic";

/**
 * POST { razorpay_payment_id, razorpay_order_id, razorpay_signature } — Razorpay Checkout's
 * success handler for a deal payment. Signature checked with the creator's secret, payment
 * fetched and matched (order, amount, currency), captured if only authorized. Idempotent.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const paymentId = typeof b.razorpay_payment_id === "string" ? b.razorpay_payment_id : "";
  const orderId = typeof b.razorpay_order_id === "string" ? b.razorpay_order_id : "";
  const signature = typeof b.razorpay_signature === "string" ? b.razorpay_signature : "";
  const pay = await prisma.dealPayment.findUnique({ where: { id }, include: { deal: { select: { creatorId: true } } } });
  if (!pay || pay.provider !== "razorpay" || !pay.providerOrderId) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (pay.status === "paid") return NextResponse.json({ ok: true });
  if (pay.status !== "pending" || orderId !== pay.providerOrderId) return NextResponse.json({ error: "This payment doesn't match." }, { status: 400 });
  const keys = await razorpayKeysFor(pay.deal.creatorId);
  if (!keys) return NextResponse.json({ error: "The creator's payment account isn't connected. Share your payment id with them." }, { status: 409 });
  if (!verifyPaymentSignature({ orderId: pay.providerOrderId, paymentId, signature, keySecret: keys.keySecret })) return NextResponse.json({ error: "We couldn't verify this payment." }, { status: 400 });
  try {
    let p = await fetchPayment(keys, paymentId);
    if (p.order_id !== pay.providerOrderId || p.amount !== pay.amountCents || p.currency !== pay.currency) return NextResponse.json({ error: "This payment doesn't match." }, { status: 400 });
    if (p.status === "authorized") p = await capturePayment(keys, paymentId, pay.amountCents, pay.currency);
    if (p.status !== "captured") return NextResponse.json({ error: "The payment hasn't completed yet." }, { status: 402 });
  } catch (e) {
    console.error("[deal confirm] razorpay check failed:", e);
    return NextResponse.json({ error: "Couldn't confirm with Razorpay. Refresh in a moment; you won't be charged twice." }, { status: 502 });
  }
  await markDealPaymentPaid(pay.id, "razorpay", paymentId);
  return NextResponse.json({ ok: true });
}
