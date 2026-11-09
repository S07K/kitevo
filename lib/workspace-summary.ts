import { prisma } from "@/lib/prisma";
import { normalizeRates, publicRateItems } from "@/lib/kit-rates";
import { normalizeKitBooking } from "@/lib/kit-booking";
import { hasManualStats, parseManualStats } from "@/lib/manual-stats";
import type { WorkspaceSummary } from "@/lib/next-steps";

const ACTIVE = ["proposed", "accepted", "delivered"];

const parse = (raw: string | null | undefined): unknown => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * One cheap read of a creator's state for the dashboard (deals, products, inquiries, setup).
 * Counts and small lists only: no cover images, no platform API calls.
 */
export async function workspaceSummary(userId: string): Promise<WorkspaceSummary> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [user, kits, deals, products, orders, newInquiries, schedulers, payments, ai] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { instagramUserId: true, instagramAccessToken: true, youtubeChannelId: true, youtubeAccessToken: true } }),
    prisma.kit.findMany({ where: { userId }, select: { rates: true, booking: true, manualStats: true } }),
    prisma.deal.findMany({
      where: { creatorId: userId, status: { in: ACTIVE } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, title: true, brandName: true, status: true, versions: { orderBy: { number: "desc" }, take: 1, select: { proposedBy: true, currency: true } }, payments: { select: { status: true, amountCents: true } } },
    }),
    prisma.product.groupBy({ by: ["status"], where: { userId, type: "download" }, _count: { _all: true } }),
    prisma.order.findMany({ where: { sellerId: userId, status: { in: ["free", "paid"] }, createdAt: { gte: since } }, select: { status: true, amountCents: true, currency: true } }),
    prisma.inquiry.count({ where: { kit: { userId }, status: "new" } }),
    prisma.schedulerConnection.count({ where: { userId } }),
    prisma.paymentConnection.count({ where: { userId } }),
    prisma.aiConnection.count({ where: { userId } }),
  ]);

  const active = deals.map((d) => {
    const v = d.versions[0];
    return {
      id: d.id,
      title: d.title,
      counterpart: d.brandName,
      status: d.status,
      awaiting: d.status === "proposed" ? (v?.proposedBy === "creator" ? ("brand" as const) : ("creator" as const)) : null,
      dueCents: d.payments.filter((p) => p.status === "due" || p.status === "pending").reduce((a, p) => a + p.amountCents, 0),
      currency: v?.currency ?? "INR",
    };
  });

  const revenue = new Map<string, number>();
  for (const o of orders) if (o.status === "paid") revenue.set(o.currency, (revenue.get(o.currency) ?? 0) + o.amountCents);
  const count = (status: string) => products.find((p) => p.status === status)?._count._all ?? 0;

  // Kitevo's key counts only for Pro (lib/copilot); a creator's own key works on any plan.
  const copilotReady = ai > 0 || !!process.env.AI_API_KEY;

  return {
    deals: {
      yourTurn: active.filter((d) => d.awaiting === "creator").length,
      toDeliver: active.filter((d) => d.status === "accepted").length,
      active: active.slice(0, 4),
    },
    products: {
      published: count("published"),
      drafts: count("draft"),
      claims30d: orders.filter((o) => o.status === "free").length,
      sales30d: orders.filter((o) => o.status === "paid").length,
      revenue30d: [...revenue].map(([currency, cents]) => ({ currency, cents })),
    },
    inquiries: { new: newInquiries },
    setup: {
      hasRates: kits.some((k) => publicRateItems(normalizeRates(parse(k.rates))).length > 0),
      bookingOn: kits.some((k) => !!normalizeKitBooking(k.booking).url),
      schedulerConnected: schedulers > 0,
      paymentConnected: payments > 0,
      statsConnected: !!((user?.instagramUserId && user.instagramAccessToken) || (user?.youtubeChannelId && user.youtubeAccessToken)),
      hasManualStats: kits.some((k) => hasManualStats(parseManualStats(k.manualStats))),
      copilotReady,
    },
  };
}
