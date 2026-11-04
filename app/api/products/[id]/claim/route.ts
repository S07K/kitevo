import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";
import { claimFreeProduct, cleanEmail } from "@/lib/commerce";
import { notifyBooking, parseSlot, reserveBooking } from "@/lib/bookings";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { inBackground } from "@/lib/background";
import { sendDownloadEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * POST { email, name?, slot?, timezone? } — claim a free product from a public kit (a free
 * booking needs `slot`, the chosen start as ISO/epoch ms). No account needed.
 * Returns the private delivery page URL (also emailed). Rate limited per IP and per email.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; name?: unknown; slot?: unknown; timezone?: unknown };
  const email = cleanEmail(body.email);
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : null;

  const ip = rateLimit(`claim:ip:${clientIp(req)}`, 10, 10 * 60 * 1000);
  const perEmail = rateLimit(`claim:email:${email}`, 5, 10 * 60 * 1000);
  if (!ip.ok || !perEmail.ok) return NextResponse.json({ error: "Too many tries. Wait a few minutes and try again." }, { status: 429 });

  const booking = await prisma.product.findUnique({ where: { id }, select: { id: true, type: true, userId: true, status: true, priceCents: true, currency: true, bookingConfig: true } });
  if (booking?.type === "booking") {
    if (booking.status !== "published" || booking.priceCents !== 0) return NextResponse.json({ error: "This booking isn't available." }, { status: 404 });
    const slot = parseSlot(body.slot);
    if (slot === null) return NextResponse.json({ error: "Pick a time first." }, { status: 400 });
    const r = await reserveBooking({ product: booking, startMs: slot, buyerEmail: email, buyerName: name, buyerTimezone: typeof body.timezone === "string" ? body.timezone : null, paidVia: null });
    if (!r.ok) return NextResponse.json({ error: "That time was just taken. Pick another.", code: "slot_taken" }, { status: 409 });
    await notifyBooking(r.order.id);
    void trackEvent("product_claimed", { userId: booking.userId, props: { productId: booking.id } });
    return NextResponse.json({ accessUrl: `${APP_URL.replace(/\/$/, "")}/o/${r.order.accessToken}` });
  }

  const result = await claimFreeProduct(id, email, name);
  if (!result) return NextResponse.json({ error: "This download isn't available." }, { status: 404 });

  const accessUrl = `${APP_URL.replace(/\/$/, "")}/o/${result.order.accessToken}`;
  const seller = await prisma.user.findUnique({ where: { id: result.product.userId }, select: { name: true, username: true } });
  const creatorName = seller?.name || seller?.username || "the creator";
  inBackground("download-email", () => sendDownloadEmail({ to: email, productTitle: result.product.title, creatorName, accessUrl }));
  if (result.created) void trackEvent("product_claimed", { userId: result.product.userId, props: { productId: result.product.id } });

  return NextResponse.json({ accessUrl });
}
