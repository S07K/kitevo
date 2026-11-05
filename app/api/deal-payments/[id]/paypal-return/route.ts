import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paypalCredsFor } from "@/lib/payment-connections";
import { capturePayPalOrder, getPayPalOrder, paypalPaysFor } from "@/lib/paypal-creator";
import { brandDealUrl, markDealPaymentPaid } from "@/lib/deals";
import { APP_URL } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/** GET ?token=<PayPal order> — captured on the creator's account and verified before marking paid. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ppId = new URL(req.url).searchParams.get("token") ?? "";
  const pay = await prisma.dealPayment.findUnique({ where: { id }, include: { deal: { select: { creatorId: true, brandToken: true } } } });
  if (!pay || pay.provider !== "paypal") return NextResponse.redirect(`${APP_URL.replace(/\/$/, "")}/`, 303);
  const back = (r: string) => NextResponse.redirect(`${brandDealUrl(pay.deal.brandToken)}?payment=${r}`, 303);
  if (pay.status === "paid") return back("paid");
  if (pay.status !== "pending" || !ppId || ppId !== pay.providerOrderId) return back("mismatch");
  const creds = await paypalCredsFor(pay.deal.creatorId);
  if (!creds) return back("unavailable");
  try {
    let o = await getPayPalOrder(creds, ppId);
    if (o.status === "APPROVED") o = await capturePayPalOrder(creds, ppId, pay.id);
    const cap = paypalPaysFor(o, pay);
    if (!cap) return back(o.status === "COMPLETED" ? "mismatch" : "processing");
    await markDealPaymentPaid(pay.id, "paypal", cap);
  } catch (e) {
    console.error("[deal paypal-return] failed:", e);
    return back("processing");
  }
  return back("paid");
}
