import { notFound } from "next/navigation";
import { AdminFrame } from "../AdminFrame";
import { getAdmin } from "@/lib/admin";
import { formatDestination, getDuePayouts, minPayoutFor, REFERRAL_TERMS } from "@/lib/referrals";
import { prisma } from "@/lib/prisma";
import { AdminPayoutsClient, type AdminRow, type AdminCommission, type AdminPayout } from "./AdminPayoutsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payouts · Admin", robots: { index: false, follow: false } };

export default async function AdminPayoutsPage() {
  if (!(await getAdmin())) notFound();

  const now = new Date();
  const [due, commissions, payouts, onHold, paidTotals, referredUsers, referrers] = await Promise.all([
    getDuePayouts(now),
    prisma.referralCommission.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, amount: true, baseAmount: true, currency: true, status: true, availableAt: true, createdAt: true, paymentId: true,
        referrer: { select: { email: true } },
        referredUser: { select: { email: true } },
      },
    }),
    prisma.referralPayout.findMany({
      orderBy: { paidAt: "desc" },
      take: 50,
      select: { id: true, amount: true, currency: true, method: true, reference: true, paidAt: true, referrer: { select: { email: true } } },
    }),
    prisma.referralCommission.groupBy({
      by: ["currency"],
      where: { status: "pending", availableAt: { gt: now } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.referralPayout.groupBy({ by: ["currency"], _sum: { amount: true } }),
    prisma.user.count({ where: { referredById: { not: null } } }),
    prisma.user.count({ where: { referrals: { some: {} } } }),
  ]);

  const totals = (rows: Array<{ currency: string; _sum: { amount: number | null } }>) =>
    Object.fromEntries(rows.map((r) => [r.currency, r._sum.amount ?? 0]));
  const stats = {
    onHold: totals(onHold),
    onHoldCount: onHold.reduce((n, r) => n + r._count._all, 0),
    paid: totals(paidTotals),
    referredUsers,
    referrers,
  };

  const rows: AdminRow[] = due.map((r) => ({
    referrerId: r.referrerId,
    name: r.name,
    email: r.email,
    currency: r.currency,
    amount: r.amount,
    commissionCount: r.commissionCount,
    meetsMinimum: r.meetsMinimum,
    minimum: minPayoutFor(r.currency),
    profile: r.profile ? { ...r.profile, destination: formatDestination(r.profile.method, r.profile.destination) } : null,
  }));
  const recent: AdminCommission[] = commissions.map((c) => ({
    id: c.id,
    amount: c.amount,
    baseAmount: c.baseAmount,
    currency: c.currency,
    status: c.status === "pending" && c.availableAt <= now ? "available" : c.status,
    availableAt: c.availableAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    paymentId: c.paymentId,
    referrerEmail: c.referrer.email,
    referredEmail: c.referredUser.email,
  }));
  const history: AdminPayout[] = payouts.map((p) => ({
    id: p.id, amount: p.amount, currency: p.currency, method: p.method, reference: p.reference,
    paidAt: p.paidAt.toISOString(), referrerEmail: p.referrer.email,
  }));

  return (
    <AdminFrame
      active="/admin/payouts"
      title="Referral payouts"
      description={
        <>
          {REFERRAL_TERMS.rateBps / 100}% for {REFERRAL_TERMS.months} months · {REFERRAL_TERMS.holdDays}-day hold · minimum{" "}
          ${(REFERRAL_TERMS.minPayout.USD ?? REFERRAL_TERMS.defaultMinPayout) / 100}. Send each payment yourself, then mark it paid here.
        </>
      }
    >
      <AdminPayoutsClient rows={rows} recent={recent} history={history} stats={stats} />
    </AdminFrame>
  );
}
