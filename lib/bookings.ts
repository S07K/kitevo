import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { newAccessToken } from "@/lib/commerce";
import { HOLD_MINUTES, generateSlots, isBookableSlot, isValidTimeZone, normalizeBookingConfig, type Busy } from "@/lib/booking-shared";

/**
 * Bookings, server side (Release C). A slot is reserved inside a transaction holding a
 * per-host advisory lock, so two buyers can never take overlapping times. Paid slots are held
 * for HOLD_MINUTES while the buyer pays; free slots are confirmed at once.
 */

type Tx = Prisma.TransactionClient;

/** Times the host can't take: confirmed bookings and unexpired holds, across all their products. */
export async function busyFor(db: Tx | typeof prisma, sellerId: string, nowMs: number): Promise<Busy[]> {
  const rows = await db.booking.findMany({
    where: {
      sellerId,
      endsAt: { gt: new Date(nowMs - 24 * 3_600_000) },
      OR: [{ status: "confirmed" }, { status: "held", holdExpiresAt: { gt: new Date(nowMs) } }],
    },
    select: { startsAt: true, endsAt: true },
  });
  return rows.map((r) => ({ start: r.startsAt.getTime(), end: r.endsAt.getTime() }));
}

/** Open slots for a booking product (UTC ms). */
export async function openSlots(product: { userId: string; bookingConfig: unknown }, nowMs = Date.now()): Promise<number[]> {
  const cfg = normalizeBookingConfig(product.bookingConfig);
  return generateSlots(cfg, await busyFor(prisma, product.userId, nowMs), nowMs);
}

export type ReserveResult =
  | { ok: true; order: Prisma.OrderGetPayload<{ include: { booking: true } }> }
  | { ok: false; error: "slot_taken" };

/**
 * Reserve `startMs` and create the order + booking in one transaction. `paid` → pending order
 * with a held slot (the caller then starts the provider checkout); otherwise a free, confirmed booking.
 */
export async function reserveBooking(p: {
  product: { id: string; userId: string; bookingConfig: unknown; currency: string; priceCents: number };
  startMs: number;
  buyerEmail: string;
  buyerName: string | null;
  buyerTimezone: string | null;
  paidVia: "razorpay" | "stripe" | null;
}): Promise<ReserveResult> {
  const cfg = normalizeBookingConfig(p.product.bookingConfig);
  const now = Date.now();
  return prisma.$transaction(async (tx) => {
    // One reservation at a time per host (released at commit/rollback).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${p.product.userId}))`;
    if (!isBookableSlot(cfg, await busyFor(tx, p.product.userId, now), now, p.startMs)) return { ok: false as const, error: "slot_taken" as const };
    const paid = !!p.paidVia;
    const order = await tx.order.create({
      data: {
        productId: p.product.id,
        sellerId: p.product.userId,
        buyerEmail: p.buyerEmail,
        buyerName: p.buyerName,
        amountCents: paid ? p.product.priceCents : 0,
        currency: p.product.currency,
        status: paid ? "pending" : "free",
        provider: p.paidVia,
        accessToken: newAccessToken(),
        booking: {
          create: {
            productId: p.product.id,
            sellerId: p.product.userId,
            startsAt: new Date(p.startMs),
            endsAt: new Date(p.startMs + cfg.durationMin * 60_000),
            status: paid ? "held" : "confirmed",
            holdExpiresAt: paid ? new Date(now + HOLD_MINUTES * 60_000) : null,
            buyerTimezone: p.buyerTimezone && isValidTimeZone(p.buyerTimezone) ? p.buyerTimezone : null,
          },
        },
      },
      include: { booking: true },
    });
    return { ok: true as const, order };
  });
}

/** Payment verified: a held booking becomes confirmed (no-op for downloads). */
export async function confirmBookingForOrder(orderId: string) {
  await prisma.booking.updateMany({ where: { orderId, status: "held" }, data: { status: "confirmed", holdExpiresAt: null } });
}

/** Parse a slot from the client: an ISO string or epoch ms. */
export function parseSlot(raw: unknown): number | null {
  const ms = typeof raw === "number" ? raw : typeof raw === "string" ? Date.parse(raw) : NaN;
  return Number.isFinite(ms) && ms % 60_000 === 0 ? ms : null;
}

/**
 * Email the buyer (time in their own zone) and the host (time in theirs) about a confirmed
 * booking. Runs in the background; never throws into the request.
 */
export async function notifyBooking(orderId: string, paid?: { amount: string; via: string }) {
  const { inBackground } = await import("@/lib/background");
  const { sendBookingEmail, sendBookingNotice } = await import("@/lib/email");
  const { APP_URL } = await import("@/lib/app-url");
  const { formatSlot } = await import("@/lib/booking-shared");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { booking: true, product: { select: { title: true, bookingConfig: true } }, seller: { select: { name: true, username: true, email: true } } },
  });
  if (!order?.booking) return;
  const base = APP_URL.replace(/\/$/, "");
  const start = order.booking.startsAt.getTime();
  const hostTz = normalizeBookingConfig(order.product.bookingConfig).timezone;
  const buyerTz = order.booking.buyerTimezone ?? hostTz;
  const creatorName = order.seller.name || order.seller.username || "the creator";
  inBackground("booking-email", () =>
    sendBookingEmail({
      to: order.buyerEmail,
      productTitle: order.product.title,
      creatorName,
      when: `${formatSlot(start, buyerTz)} (${buyerTz.replace(/_/g, " ")})`,
      accessUrl: `${base}/o/${order.accessToken}`,
      paidAmount: paid?.amount,
      paidVia: paid?.via,
    }),
  );
  if (order.seller.email) {
    const sellerEmail = order.seller.email;
    inBackground("booking-notice", () =>
      sendBookingNotice({
        to: sellerEmail,
        productTitle: order.product.title,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        when: `${formatSlot(start, hostTz)} (${hostTz.replace(/_/g, " ")})`,
        manageUrl: `${base}/products`,
      }),
    );
  }
}
