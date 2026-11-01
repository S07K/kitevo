import { notFound } from "next/navigation";
import { AppNav } from "@/app/components/AppNav";
import { getAdmin } from "@/lib/admin";
import { getDuePayouts, minPayoutFor, REFERRAL_TERMS } from "@/lib/referrals";
import { prisma } from "@/lib/prisma";
import { AdminPayoutsClient, type AdminRow, type AdminCommission, type AdminPayout } from "./AdminPayoutsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payouts · Admin", robots: { index: false, follow: false } };

export default async function AdminPayoutsPage() {
  if (!(await getAdmin())) notFound();

  const now = new Date();
  const [due, commissions, payouts] = await Promise.all([
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
  ]);

  const rows: AdminRow[] = due.map((r) => ({
    referrerId: r.referrerId,
    name: r.name,
    email: r.email,
    currency: r.currency,
    amount: r.amount,
    commissionCount: r.commissionCount,
    meetsMinimum: r.meetsMinimum,
    minimum: minPayoutFor(r.currency),
    profile: r.profile,
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
    <div className="min-h-screen bg-muted/20">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-8">
        <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight">Referral payouts</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {REFERRAL_TERMS.rateBps / 100}% for {REFERRAL_TERMS.months} months · {REFERRAL_TERMS.holdDays}-day hold · paid manually
          (PayPal / Wise / bank), then recorded here.
        </p>
        <AdminPayoutsClient rows={rows} recent={recent} history={history} />
      </main>
    </div>
  );
}
