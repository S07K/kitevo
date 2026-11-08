import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripeKeyFor } from "@/lib/payment-connections";
import { retrieveCheckoutSession, sessionPaysFor } from "@/lib/stripe-creator";
import { brandDealUrl, markDealPaymentPaid } from "@/lib/deals";
import { APP_URL } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/** GET ?session_id= — Stripe sends the brand here; the session is verified, never trusted. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
  const pay = await prisma.dealPayment.findUnique({ where: { id }, include: { deal: { select: { creatorId: true, brandToken: true } } } });
  if (!pay || pay.provider !== "stripe") return NextResponse.redirect(`${APP_URL.replace(/\/$/, "")}/`, 303);
  const back = (r: string) => NextResponse.redirect(`${brandDealUrl(pay.deal.brandToken)}?payment=${r}`, 303);
  if (pay.status === "paid") return back("paid");
  if (pay.status !== "pending" || !sessionId || sessionId !== pay.providerOrderId) return back("mismatch");
  const key = await stripeKeyFor(pay.deal.creatorId);
  if (!key) return back("unavailable");
  try {
    const s = await retrieveCheckoutSession(key, sessionId);
    if (!sessionPaysFor(s, pay)) return back(s.payment_status === "unpaid" ? "processing" : "mismatch");
    await markDealPaymentPaid(pay.id, "stripe", s.payment_intent ?? s.id);
  } catch (e) {
    console.error("[deal stripe-return] failed:", e);
    return back("processing");
  }
  return back("paid");
}
