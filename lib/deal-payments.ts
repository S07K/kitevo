import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";
import { paypalCredsFor, razorpayKeysFor, stripeKeyFor } from "@/lib/payment-connections";
import { createOrder, fetchOrderPayments } from "@/lib/razorpay";
import { createCheckoutSession, retrieveCheckoutSession, sessionPaysFor } from "@/lib/stripe-creator";
import { approvalUrl, capturePayPalOrder, createPayPalOrder, getPayPalOrder, paypalPaysFor, paypalSupports } from "@/lib/paypal-creator";
import { markDealPaymentPaid, brandDealUrl } from "@/lib/deals";

/**
 * Paying a deal's payment into the CREATOR's own account. Same verified flows as product
 * checkout (lib/razorpay, stripe-creator, paypal-creator), with the DealPayment id as the
 * "order" id the provider echoes back. The amount always comes from the DealPayment.
 */

export type DealPayProvider = "razorpay" | "stripe" | "paypal";

const base = () => APP_URL.replace(/\/$/, "");

/** Which of the creator's accounts can take this currency (PayPal: no INR). */
export async function payOptions(creatorId: string, currency: string): Promise<DealPayProvider[]> {
  const rows = await prisma.paymentConnection.findMany({ where: { userId: creatorId }, select: { provider: true } });
  const have = rows.map((r) => r.provider);
  return (["razorpay", "stripe", "paypal"] as const).filter((p) => have.includes(p) && (p !== "paypal" || paypalSupports(currency)));
}

/**
 * A payment whose checkout started earlier may have gone through (tab closed, slow return).
 * Ask the provider before starting another, so the brand is never charged twice.
 */
export async function reconcile(paymentId: string): Promise<boolean> {
  const pay = await prisma.dealPayment.findUnique({ where: { id: paymentId }, include: { deal: { select: { creatorId: true } } } });
  if (!pay || pay.status !== "pending" || !pay.provider || !pay.providerOrderId) return false;
  const order = { id: pay.id, amountCents: pay.amountCents, currency: pay.currency };
  try {
    if (pay.provider === "razorpay") {
      const keys = await razorpayKeysFor(pay.deal.creatorId);
      const p = keys && (await fetchOrderPayments(keys, pay.providerOrderId)).find((x) => x.status === "captured" && x.amount === pay.amountCents && x.currency === pay.currency);
      if (p) return markDealPaymentPaid(pay.id, "razorpay", p.id);
    } else if (pay.provider === "stripe") {
      const key = await stripeKeyFor(pay.deal.creatorId);
      const s = key && (await retrieveCheckoutSession(key, pay.providerOrderId));
      if (s && sessionPaysFor(s, order)) return markDealPaymentPaid(pay.id, "stripe", s.payment_intent ?? s.id);
    } else if (pay.provider === "paypal") {
      const creds = await paypalCredsFor(pay.deal.creatorId);
      if (creds) {
        let o = await getPayPalOrder(creds, pay.providerOrderId);
        if (o.status === "APPROVED") o = await capturePayPalOrder(creds, o.id, pay.id);
        const cap = paypalPaysFor(o, order);
        if (cap) return markDealPaymentPaid(pay.id, "paypal", cap);
      }
    }
  } catch (e) {
    console.error("[deal-payments] reconcile failed:", e);
  }
  return false;
}

export type StartResult =
  | { kind: "paid" }
  | { kind: "redirect"; provider: "stripe" | "paypal"; url: string }
  | { kind: "razorpay"; keyId: string; razorpayOrderId: string; amount: number; currency: string; name: string; description: string; email: string }
  | { kind: "error"; status: number; error: string };

export async function startDealPayment(paymentId: string, wanted: string | null): Promise<StartResult> {
  if (await reconcile(paymentId)) return { kind: "paid" };
  const pay = await prisma.dealPayment.findUnique({ where: { id: paymentId }, include: { deal: { include: { creator: { select: { name: true, username: true } } } } } });
  if (!pay) return { kind: "error", status: 404, error: "Payment not found." };
  if (pay.status === "paid") return { kind: "paid" };
  if (pay.status !== "due" && pay.status !== "pending") return { kind: "error", status: 409, error: "This payment isn't due yet." };
  const deal = pay.deal;
  if (!["accepted", "delivered"].includes(deal.status)) return { kind: "error", status: 409, error: "This deal isn't open for payment." };

  const options = await payOptions(deal.creatorId, pay.currency);
  const provider = (wanted && (options as string[]).includes(wanted) ? wanted : options[0]) as DealPayProvider | undefined;
  if (!provider) return { kind: "error", status: 409, error: "The creator hasn't connected a payment account that takes this currency yet. They've been told." };

  const label = `${deal.title} (${pay.kind === "advance" ? "advance" : pay.kind === "balance" ? "balance" : "payment"})`;
  const creatorName = deal.creator.name || deal.creator.username || "Creator";
  const back = brandDealUrl(deal.brandToken);
  try {
    if (provider === "stripe") {
      const key = (await stripeKeyFor(deal.creatorId))!;
      const s = await createCheckoutSession(key, {
        orderId: pay.id,
        title: label,
        amount: pay.amountCents,
        currency: pay.currency,
        email: deal.brandEmail,
        successUrl: `${base()}/api/deal-payments/${pay.id}/stripe-return?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${back}?payment=cancelled`,
      });
      if (!s.url) throw new Error("Stripe returned no checkout URL");
      await prisma.dealPayment.update({ where: { id: pay.id }, data: { status: "pending", provider, providerOrderId: s.id } });
      return { kind: "redirect", provider, url: s.url };
    }
    if (provider === "paypal") {
      const creds = (await paypalCredsFor(deal.creatorId))!;
      const o = await createPayPalOrder(creds, { orderId: pay.id, title: label, amount: pay.amountCents, currency: pay.currency, brandName: creatorName, returnUrl: `${base()}/api/deal-payments/${pay.id}/paypal-return`, cancelUrl: `${back}?payment=cancelled` });
      const href = approvalUrl(o);
      if (!href) throw new Error("PayPal returned no approval link");
      await prisma.dealPayment.update({ where: { id: pay.id }, data: { status: "pending", provider, providerOrderId: o.id } });
      return { kind: "redirect", provider, url: href };
    }
    const keys = (await razorpayKeysFor(deal.creatorId))!;
    const rp = await createOrder(keys, { amount: pay.amountCents, currency: pay.currency, receipt: pay.id, notes: { kitevo_deal_payment_id: pay.id, kitevo_deal_id: deal.id } });
    await prisma.dealPayment.update({ where: { id: pay.id }, data: { status: "pending", provider, providerOrderId: rp.id } });
    return { kind: "razorpay", keyId: keys.keyId, razorpayOrderId: rp.id, amount: rp.amount, currency: rp.currency, name: creatorName, description: label, email: deal.brandEmail };
  } catch (e) {
    console.error(`[deal-payments] ${provider} start failed:`, e);
    return { kind: "error", status: 502, error: "Couldn't start the payment. Try again in a moment." };
  }
}
