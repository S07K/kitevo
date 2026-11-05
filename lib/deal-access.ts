import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dealInclude, roleFor, type DealWithAll } from "@/lib/deals";
import type { DealRole } from "@/lib/deals-shared";

/**
 * Who is looking at a deal: the creator (session), the brand's account (session) or anyone
 * holding the brand's private link token. Returns null when neither matches (→ 404, never 403,
 * so deal ids can't be probed).
 */
export async function dealForViewer(dealId: string, token: string | null): Promise<{ deal: DealWithAll; role: DealRole; userId: string | null } | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, include: dealInclude });
  if (!deal) return null;
  const role = roleFor(deal, { userId, token });
  return role ? { deal, role, userId } : null;
}

export async function dealForToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  return prisma.deal.findUnique({ where: { brandToken: token }, include: dealInclude });
}

/** The client-facing shape: everything both sides may see (no tokens for the creator side). */
export function publicDeal(deal: DealWithAll, role: DealRole) {
  return {
    id: deal.id,
    title: deal.title,
    status: deal.status,
    source: deal.source,
    brandName: deal.brandName,
    creator: { name: deal.creator.name || deal.creator.username || "Creator", username: deal.creator.username, avatarUrl: deal.creator.avatarUrl },
    role,
    brandToken: role === "brand" ? deal.brandToken : null,
    deliveredAt: deal.deliveredAt,
    createdAt: deal.createdAt,
    versions: deal.versions.map((v) => ({
      id: v.id,
      number: v.number,
      proposedBy: v.proposedBy,
      deliverables: v.deliverables,
      amountCents: v.amountCents,
      currency: v.currency,
      paymentPlan: v.paymentPlan,
      advancePct: v.advancePct,
      dueDate: v.dueDate ? v.dueDate.toISOString().slice(0, 10) : null,
      notes: v.notes,
      status: v.status,
      createdAt: v.createdAt,
      respondedAt: v.respondedAt,
    })),
    payments: deal.payments.map((p) => ({ id: p.id, kind: p.kind, amountCents: p.amountCents, currency: p.currency, status: p.status, provider: p.provider, paidAt: p.paidAt })),
    events: deal.events.map((e) => ({ id: e.id, actor: e.actor, type: e.type, data: e.data, createdAt: e.createdAt })),
  };
}
export type PublicDeal = ReturnType<typeof publicDeal>;
