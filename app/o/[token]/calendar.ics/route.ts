import { prisma } from "@/lib/prisma";
import { normalizeBookingConfig } from "@/lib/booking-shared";
import { bookingIcs } from "@/lib/ics";

export const dynamic = "force-dynamic";

/** GET — the booking as a calendar file. Same private token as the booking page. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { accessToken: token },
    include: { booking: true, product: { select: { title: true, bookingConfig: true } }, seller: { select: { name: true, username: true } } },
  });
  if (!order?.booking || order.booking.status !== "confirmed") return new Response("Not found", { status: 404 });
  const host = order.seller.name || order.seller.username || "Creator";
  const meeting = normalizeBookingConfig(order.product.bookingConfig).meetingUrl;
  const ics = bookingIcs({
    uid: order.booking.id,
    start: order.booking.startsAt,
    end: order.booking.endsAt,
    title: `${order.product.title} with ${host}`,
    description: `Join: ${meeting}`,
    url: meeting,
    organizerName: host,
  });
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="booking.ics"', "Cache-Control": "private, no-store" } });
}
