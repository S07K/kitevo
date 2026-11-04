import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openSlots } from "@/lib/bookings";
import { normalizeBookingConfig } from "@/lib/booking-shared";

export const dynamic = "force-dynamic";

/**
 * GET — open times for a booking product, as UTC ISO strings (the page shows them in the
 * buyer's zone). Never returns the meeting link. Drafts are visible to their owner only.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({ where: { id }, select: { userId: true, type: true, status: true, bookingConfig: true } });
  if (!product || product.type !== "booking") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (product.status !== "published") {
    const session = await getServerSession(authOptions);
    if (session?.user?.id !== product.userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const cfg = normalizeBookingConfig(product.bookingConfig);
  const slots = await openSlots(product);
  return NextResponse.json(
    { durationMin: cfg.durationMin, hostTimezone: cfg.timezone, slots: slots.map((s) => new Date(s).toISOString()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
