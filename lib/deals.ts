import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";
import { formatPrice } from "@/lib/commerce-shared";
import { allowedActions, planLabel, splitPlan, type DealRole, type DealStatus, type Quote } from "@/lib/deals-shared";

/**
 * Brand deals, server side. Creator-owned payments: brands pay straight into the creator's own
 * Razorpay / Stripe / PayPal; Kitevo records the agreement and the payments, never the money.
 * Every action re-checks `allowedActions` inside a transaction and writes a DealEvent, so both
 * sides always see the same history.
 */

type Tx = Prisma.TransactionClient;
export class DealError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const base = () => APP_URL.replace(/\/$/, "");
export const creatorDealUrl = (id: string) => `${base()}/deals/${id}`;
export const brandDealUrl = (token: string) => `${base()}/d/${token}`;

export const dealInclude = {
  versions: { orderBy: { number: "desc" } },
  payments: { orderBy: { createdAt: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
  creator: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } },
} satisfies Prisma.DealInclude;
export type DealWithAll = Prisma.DealGetPayload<{ include: typeof dealInclude }>;

/** Which side of the deal a viewer is on: account (creator or brand) or the brand's private link. */
export function roleFor(deal: { creatorId: string; brandUserId: string | null; brandToken: string }, viewer: { userId?: string | null; token?: string | null }): DealRole | null {
  if (viewer.userId && viewer.userId === deal.creatorId) return "creator";
  if (viewer.userId && deal.brandUserId && viewer.userId === deal.brandUserId) return "brand";
  if (viewer.token && viewer.token === deal.brandToken) return "brand";
  return null;
}

export function dealState(deal: DealWithAll) {
  const open = deal.versions.find((v) => v.status === "open") ?? null;
  const accepted = deal.versions.find((v) => v.status === "accepted") ?? null;
  const anyPaid = deal.payments.some((p) => p.status === "paid");
  return { open, accepted, anyPaid, current: open ?? accepted ?? deal.versions[0] ?? null };
}

async function load(tx: Tx, dealId: string) {
  const d = await tx.deal.findUnique({ where: { id: dealId }, include: dealInclude });
  if (!d) throw new DealError("Deal not found", 404);
  return d;
}

function guard(deal: DealWithAll, role: DealRole, action: keyof ReturnType<typeof allowedActions>) {
  const s = dealState(deal);
  const can = allowedActions({ role, status: deal.status as DealStatus, openBy: (s.open?.proposedBy as DealRole) ?? null, anyPaid: s.anyPaid });
  if (!can[action]) throw new DealError("That isn't possible at this stage of the deal.", 409);
  return s;
}

const versionData = (q: Quote) => ({
  deliverables: q.deliverables as unknown as Prisma.InputJsonValue,
  amountCents: q.amountCents,
  currency: q.currency,
  paymentPlan: q.paymentPlan,
  advancePct: q.advancePct,
  dueDate: q.dueDate ? new Date(`${q.dueDate}T00:00:00Z`) : null,
  notes: q.notes,
});
const event = (tx: Tx, dealId: string, actor: DealRole | "system", type: string, data: Record<string, unknown> = {}) =>
  tx.dealEvent.create({ data: { dealId, actor, type, data: data as Prisma.InputJsonValue } });
const money = (q: { amountCents: number; currency: string }) => formatPrice(q.amountCents, q.currency);

export async function createDeal(p: {
  creatorId: string;
  brandUserId: string | null;
  brandName: string;
  brandEmail: string;
  title: string;
  source: "campaign" | "conversation" | "inquiry" | "direct";
  campaignApplicationId?: string | null;
  conversationId?: string | null;
  inquiryId?: string | null;
  proposedBy: DealRole;
  quote: Quote;
}) {
  const deal = await prisma.$transaction(async (tx) => {
    const d = await tx.deal.create({
      data: {
        creatorId: p.creatorId,
        brandUserId: p.brandUserId,
        brandName: p.brandName.slice(0, 100),
        brandEmail: p.brandEmail,
        title: p.title.slice(0, 100),
        source: p.source,
        campaignApplicationId: p.campaignApplicationId ?? null,
        conversationId: p.conversationId ?? null,
        inquiryId: p.inquiryId ?? null,
        brandToken: randomBytes(24).toString("base64url"),
        versions: { create: { number: 1, proposedBy: p.proposedBy, ...versionData(p.quote) } },
      },
    });
    await event(tx, d.id, p.proposedBy, "proposed", { version: 1, amount: money(p.quote), plan: planLabel(p.quote) });
    return load(tx, d.id);
  });
  await notify(deal, p.proposedBy === "creator" ? "brand" : "creator", "proposed");
  return deal;
}

/** A counter-offer, or a revision of agreed terms (needs the other side to accept again). */
export async function proposeVersion(dealId: string, role: DealRole, q: Quote) {
  const deal = await prisma.$transaction(async (tx) => {
    const d = await load(tx, dealId);
    const s = guard(d, role, "propose");
    if (s.open) await tx.dealVersion.update({ where: { id: s.open.id }, data: { status: "superseded", respondedAt: new Date() } });
    const number = (d.versions[0]?.number ?? 0) + 1;
    await tx.dealVersion.create({ data: { dealId, number, proposedBy: role, ...versionData(q) } });
    await tx.deal.update({ where: { id: dealId }, data: { status: "proposed" } });
    await event(tx, dealId, role, s.open ? "countered" : "revised", { version: number, amount: money(q), plan: planLabel(q) });
    return load(tx, dealId);
  });
  await notify(deal, role === "creator" ? "brand" : "creator", "countered");
  return deal;
}

/** After a decline/withdraw, agreed terms (if any) still stand; otherwise the deal ends. */
async function settleAfterNo(tx: Tx, d: DealWithAll, endStatus: "declined" | "cancelled") {
  const stillAgreed = d.versions.some((v) => v.status === "accepted");
  await tx.deal.update({ where: { id: d.id }, data: { status: stillAgreed ? (d.deliveredAt ? "delivered" : "accepted") : endStatus } });
}

export async function respond(dealId: string, role: DealRole, answer: "accept" | "decline") {
  const deal = await prisma.$transaction(async (tx) => {
    const d = await load(tx, dealId);
    const s = guard(d, role, answer);
    const v = s.open!;
    const now = new Date();
    if (answer === "decline") {
      await tx.dealVersion.update({ where: { id: v.id }, data: { status: "declined", respondedAt: now } });
      await event(tx, dealId, role, "declined", { version: v.number });
      await settleAfterNo(tx, d, "declined");
      return load(tx, dealId);
    }
    // Accept: these terms replace any earlier agreement; unpaid payments are rebuilt from the plan.
    if (s.accepted) await tx.dealVersion.update({ where: { id: s.accepted.id }, data: { status: "superseded" } });
    await tx.dealVersion.update({ where: { id: v.id }, data: { status: "accepted", respondedAt: now } });
    await event(tx, dealId, role, "accepted", { version: v.number, amount: money(v), plan: planLabel({ paymentPlan: v.paymentPlan as Quote["paymentPlan"], advancePct: v.advancePct }) });
    await tx.dealPayment.deleteMany({ where: { dealId, status: { in: ["scheduled", "due", "pending"] } } });
    for (const part of splitPlan({ amountCents: v.amountCents, paymentPlan: v.paymentPlan as Quote["paymentPlan"], advancePct: v.advancePct })) {
      await tx.dealPayment.create({
        data: { dealId, kind: part.kind, amountCents: part.amountCents, currency: v.currency, status: part.payableOn === "acceptance" ? "due" : "scheduled" },
      });
      if (part.payableOn === "acceptance") await event(tx, dealId, "system", "payment_due", { kind: part.kind, amount: money({ amountCents: part.amountCents, currency: v.currency }) });
    }
    await tx.deal.update({ where: { id: dealId }, data: { status: "accepted" } });
    return load(tx, dealId);
  });
  await notify(deal, role === "creator" ? "brand" : "creator", answer === "accept" ? "accepted" : "declined");
  return deal;
}

export async function withdraw(dealId: string, role: DealRole) {
  return prisma.$transaction(async (tx) => {
    const d = await load(tx, dealId);
    const s = guard(d, role, "withdraw");
    await tx.dealVersion.update({ where: { id: s.open!.id }, data: { status: "withdrawn", respondedAt: new Date() } });
    await event(tx, dealId, role, "withdrawn", { version: s.open!.number });
    await settleAfterNo(tx, d, "cancelled");
    return load(tx, dealId);
  });
}

export async function cancel(dealId: string, role: DealRole) {
  const deal = await prisma.$transaction(async (tx) => {
    const d = await load(tx, dealId);
    guard(d, role, "cancel");
    await tx.dealVersion.updateMany({ where: { dealId, status: "open" }, data: { status: "withdrawn", respondedAt: new Date() } });
    await tx.dealPayment.deleteMany({ where: { dealId, status: { not: "paid" } } });
    await tx.deal.update({ where: { id: dealId }, data: { status: "cancelled" } });
    await event(tx, dealId, role, "cancelled");
    return load(tx, dealId);
  });
  await notify(deal, role === "creator" ? "brand" : "creator", "cancelled");
  return deal;
}

/** Creator marks the work delivered: payments due on delivery become payable. */
export async function markDelivered(dealId: string, role: DealRole) {
  const deal = await prisma.$transaction(async (tx) => {
    const d = await load(tx, dealId);
    guard(d, role, "markDelivered");
    await tx.dealPayment.updateMany({ where: { dealId, status: "scheduled" }, data: { status: "due" } });
    const allPaid = d.payments.every((p) => p.status === "paid");
    await tx.deal.update({ where: { id: dealId }, data: { status: allPaid ? "completed" : "delivered", deliveredAt: new Date() } });
    await event(tx, dealId, "creator", "delivered");
    for (const p of d.payments.filter((x) => x.status === "scheduled")) {
      await event(tx, dealId, "system", "payment_due", { kind: p.kind, amount: money(p) });
    }
    if (allPaid) await event(tx, dealId, "system", "completed");
    return load(tx, dealId);
  });
  await notify(deal, "brand", "delivered");
  return deal;
}

/**
 * A verified provider payment for a DealPayment. Only the first confirmation flips it (and
 * emails); a delivered deal with everything paid completes.
 */
export async function markDealPaymentPaid(paymentId: string, provider: string, providerRef: string) {
  const flipped = await prisma.dealPayment.updateMany({ where: { id: paymentId, status: { in: ["due", "pending"] } }, data: { status: "paid", provider, providerRef, paidAt: new Date() } });
  if (flipped.count !== 1) return false;
  const pay = await prisma.dealPayment.findUniqueOrThrow({ where: { id: paymentId } });
  const deal = await prisma.$transaction(async (tx) => {
    await event(tx, pay.dealId, "brand", "paid", { kind: pay.kind, amount: money(pay), provider });
    const d = await load(tx, pay.dealId);
    if (d.status === "delivered" && d.payments.every((p) => p.status === "paid")) {
      await tx.deal.update({ where: { id: d.id }, data: { status: "completed" } });
      await event(tx, d.id, "system", "completed");
    }
    return load(tx, pay.dealId);
  });
  await notify(deal, "creator", "paid", money(pay));
  return true;
}

/* ─── Emails ───────────────────────────────────────────────────────────── */

async function notify(deal: DealWithAll, to: DealRole, what: "proposed" | "countered" | "accepted" | "declined" | "cancelled" | "delivered" | "paid", amount?: string) {
  const { inBackground } = await import("@/lib/background");
  const { sendDealEmail } = await import("@/lib/email");
  const creatorName = deal.creator.name || deal.creator.username || "The creator";
  const { current } = dealState(deal);
  const terms = current ? `${money(current)} · ${planLabel({ paymentPlan: current.paymentPlan as Quote["paymentPlan"], advancePct: current.advancePct })}` : "";
  const other = to === "brand" ? creatorName : deal.brandName;
  const copy: Record<typeof what, { subject: string; heading: string; lines: string[]; cta: string }> = {
    proposed: { subject: `New deal from ${other}: ${deal.title}`, heading: deal.title, lines: [`${other} sent you terms for "${deal.title}": ${terms}.`, "Review the deliverables, then accept, counter or decline."], cta: "Review the deal" },
    countered: { subject: `Updated terms: ${deal.title}`, heading: "New terms to review", lines: [`${other} proposed new terms for "${deal.title}": ${terms}.`], cta: "Review the terms" },
    accepted: { subject: `Deal agreed: ${deal.title}`, heading: "Deal agreed", lines: [`${other} accepted the terms for "${deal.title}": ${terms}.`, to === "brand" ? "Any payment due now can be paid from the deal page." : "The brand can now pay what's due from their deal page."], cta: "Open the deal" },
    declined: { subject: `Terms declined: ${deal.title}`, heading: "Terms declined", lines: [`${other} declined the latest terms for "${deal.title}".`], cta: "Open the deal" },
    cancelled: { subject: `Deal cancelled: ${deal.title}`, heading: "Deal cancelled", lines: [`${other} cancelled "${deal.title}".`], cta: "Open the deal" },
    delivered: { subject: `Delivered: ${deal.title}`, heading: "Work delivered", lines: [`${creatorName} marked "${deal.title}" as delivered.`, "Any payment due on delivery can now be paid from the deal page."], cta: "Open the deal" },
    paid: { subject: `Payment received: ${amount} for ${deal.title}`, heading: "Payment received", lines: [`${deal.brandName} paid ${amount} for "${deal.title}". It went straight to your connected account.`], cta: "Open the deal" },
  };
  const c = copy[what];
  const email = to === "brand" ? deal.brandEmail : deal.creator.email;
  if (!email) return;
  const url = to === "brand" ? brandDealUrl(deal.brandToken) : creatorDealUrl(deal.id);
  inBackground(`deal-${what}`, () => sendDealEmail({ to: email, subject: c.subject, heading: c.heading, lines: c.lines, ctaLabel: c.cta, ctaUrl: url }));
}
