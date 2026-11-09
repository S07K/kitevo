import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { payments, type SubscriptionSnapshot } from "@/lib/payments";
import { SUBSCRIPTION_TIERS, getTierByPriceId } from "@/config/subscriptions";
import { AdminFrame, adminCard, adminEyebrow, fmtDateTime, StatusPill } from "../../AdminFrame";
import { AuditTable } from "../../AuditTable";
import { PlanControls, ReplayButton, SuspendControls } from "../../AdminActions";
import { reasonLabel } from "@/lib/safety-shared";

export const dynamic = "force-dynamic";
export const metadata = { title: "User · Admin", robots: { index: false, follow: false } };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children ?? "—"}</dd>
    </div>
  );
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) notFound();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, username: true, accountType: true, createdAt: true,
      emailVerified: true, onboardingCompletedAt: true, passwordHash: true, suspendedAt: true,
      verifiedTier: true, compedTier: true, stripeCustomerId: true,
      instagramUserId: true, instagramTokenExpiresAt: true, youtubeChannelId: true,
      followerCount: true, engagementRate: true, statsUpdatedAt: true,
      referralCode: true, referredAt: true,
      referredBy: { select: { id: true, email: true } },
      brandProfile: { select: { companyName: true } },
      accounts: { select: { provider: true } },
      kits: { select: { id: true, name: true, slug: true, passwordHash: true, createdAt: true, _count: { select: { views: true } } } },
      _count: { select: { referrals: true, campaigns: true, campaignApplications: true, blockedBy: true } },
      reportsAgainst: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, reason: true, status: true, createdAt: true, note: true } },
    },
  });
  if (!user) notFound();

  // Live subscription, so the page shows what the provider says, not just our cached badge.
  let sub: SubscriptionSnapshot | null = null;
  let subError: string | null = null;
  if (user.stripeCustomerId) {
    try {
      sub = await payments.getSubscription(user.stripeCustomerId);
    } catch (e) {
      subError = e instanceof Error ? e.message : String(e);
    }
  }

  const [audit, events, deliveries] = await Promise.all([
    prisma.adminAuditLog.findMany({ where: { targetUserId: id }, orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.analyticsEvent.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 15 }),
    // Domain-event payloads are small JSON; matching the quoted id is exact enough.
    prisma.webhookEvent.findMany({
      where: {
        OR: [
          { payload: { contains: `"${id}"` } },
          ...(user.stripeCustomerId ? [{ payload: { contains: `"${user.stripeCustomerId}"` } }] : []),
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const subTier = getTierByPriceId(sub?.priceId ?? null);
  const compTiers = SUBSCRIPTION_TIERS.filter((t) => t.id !== "free").map((t) => ({ id: t.id, name: t.name }));
  const signIn = [user.passwordHash ? "password" : null, ...user.accounts.map((a) => a.provider)].filter(Boolean).join(", ");

  return (
    <AdminFrame
      active="/admin"
      title={user.brandProfile?.companyName ?? user.name ?? user.email}
      description={
        <>
          <Link href="/admin" className="underline underline-offset-2">← Users & ops</Link> · {user.email}
          {user.username && (
            <>
              {" "}· <Link href={`/${user.username}`} target="_blank" className="underline underline-offset-2">@{user.username}</Link>
            </>
          )}
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${adminCard} p-5`}>
          <h2 className={adminEyebrow}>Plan</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <Field label="Badge (verifiedTier)">{user.verifiedTier}</Field>
            <Field label="Comp">{user.compedTier}</Field>
            <Field label={`${payments.id} customer`}>
              {user.stripeCustomerId && <span className="font-mono text-xs">{user.stripeCustomerId}</span>}
            </Field>
            <Field label="Live subscription">
              {subError ? (
                <span className="text-red-700 dark:text-red-400">Lookup failed: {subError}</span>
              ) : sub ? (
                <>
                  {subTier?.name ?? sub.priceId ?? "unknown price"} · {sub.status}
                  {!sub.isActive && <span className="text-muted-foreground"> (no access)</span>}
                </>
              ) : user.stripeCustomerId ? (
                "none"
              ) : null}
            </Field>
          </dl>
          <div className="border-border mt-5 border-t pt-4">
            <PlanControls userId={user.id} compedTier={user.compedTier} tiers={compTiers} hasCustomer={!!user.stripeCustomerId} />
            <p className="text-muted-foreground mt-3 text-xs">
              Badge = live subscription’s tier, else the comp (a hand-granted <code>top_creator</code> is kept). Every
              change is recorded in the audit log below.
            </p>
          </div>
        </section>

        <section className={`${adminCard} p-5`}>
          <h2 className={adminEyebrow}>Account</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <Field label="Type">{user.accountType}</Field>
            <Field label="Joined">{fmtDateTime(user.createdAt)}</Field>
            <Field label="Email verified">{user.emailVerified ? "yes" : "no"}</Field>
            <Field label="Onboarding">{user.onboardingCompletedAt ? fmtDateTime(user.onboardingCompletedAt) : "not finished"}</Field>
            <Field label="Sign-in">{signIn || null}</Field>
            <Field label="User id"><span className="font-mono text-xs">{user.id}</span></Field>
            <Field label="Instagram">
              {user.instagramUserId
                ? `connected${user.instagramTokenExpiresAt ? ` · token expires ${fmtDateTime(user.instagramTokenExpiresAt)}` : ""}`
                : null}
            </Field>
            <Field label="YouTube">{user.youtubeChannelId ? "connected" : null}</Field>
            <Field label="Cached stats">
              {user.statsUpdatedAt
                ? `${user.followerCount?.toLocaleString("en-US") ?? "—"} followers · ${user.engagementRate?.toFixed(2) ?? "—"}% eng.`
                : null}
            </Field>
            <Field label="Referral">
              {[
                user.referredBy && `referred by ${user.referredBy.email}`,
                user._count.referrals ? `referred ${user._count.referrals}` : null,
                user.referralCode && `code ${user.referralCode}`,
              ].filter(Boolean).join(" · ") || null}
            </Field>
            {user.accountType === "brand" ? (
              <Field label="Campaigns">{user._count.campaigns}</Field>
            ) : (
              <Field label="Applications">{user._count.campaignApplications}</Field>
            )}
          </dl>
        </section>
      </div>

      <section className={`${adminCard} mt-6 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={adminEyebrow}>Safety</h2>
          <SuspendControls userId={user.id} suspended={!!user.suspendedAt} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Status">
            {user.suspendedAt ? <span className="text-red-700 dark:text-red-400">Suspended {fmtDateTime(user.suspendedAt)}</span> : "Active"}
          </Field>
          <Field label="Reports against">{user.reportsAgainst.length ? `${user.reportsAgainst.length}${user.reportsAgainst.length === 10 ? "+" : ""}` : "0"}</Field>
          <Field label="Blocked by">{`${user._count.blockedBy} account${user._count.blockedBy === 1 ? "" : "s"}`}</Field>
        </dl>
        {user.reportsAgainst.length > 0 && (
          <ul className="divide-border mt-4 divide-y border-t border-border text-sm">
            {user.reportsAgainst.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
                <span className="font-medium">{reasonLabel(r.reason)}</span>
                <StatusPill status={r.status} />
                {r.note && <span className="text-muted-foreground min-w-0 basis-full truncate text-xs">“{r.note}”</span>}
                <span className="text-muted-foreground ml-auto text-xs">{fmtDateTime(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {user.accountType !== "brand" && (
        <section className={`${adminCard} mt-6 p-5`}>
          <h2 className={adminEyebrow}>Kits ({user.kits.length})</h2>
          {user.kits.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">No kits.</p>
          ) : (
            <ul className="divide-border mt-3 divide-y text-sm">
              {user.kits.map((k) => (
                <li key={k.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
                  <Link href={`/kit/${k.slug}`} target="_blank" className="font-medium underline-offset-2 hover:underline">
                    {k.name}
                  </Link>
                  <span className="text-muted-foreground font-mono text-xs">/kit/{k.slug}</span>
                  {k.passwordHash && <span className="text-muted-foreground text-xs">password-protected</span>}
                  <span className="text-muted-foreground ml-auto text-xs">{k._count.views} views</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className={`${adminCard} mt-6 p-5`}>
        <h2 className={adminEyebrow}>Payment webhooks for this user</h2>
        {deliveries.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">None logged.</p>
        ) : (
          <ul className="divide-border mt-3 divide-y text-sm">
            {deliveries.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="text-muted-foreground w-32 shrink-0 text-xs tabular-nums">{fmtDateTime(w.updatedAt)}</span>
                <span className="font-mono text-xs">{w.type}</span>
                <StatusPill status={w.status} />
                <span className="text-muted-foreground min-w-0 flex-1 break-words text-xs">{w.error ?? ""}</span>
                {w.payload && w.status !== "processed" && <ReplayButton id={w.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${adminCard} mt-6 p-5`}>
        <h2 className={adminEyebrow}>Recent funnel events</h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">None.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {events.map((e) => (
              <li key={e.id} className="rounded-full border border-border px-2.5 py-1">
                <span className="font-mono">{e.name}</span>{" "}
                <span className="text-muted-foreground">{fmtDateTime(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AuditTable title="Admin changes to this account" rows={audit.map((a) => ({ ...a, targetEmail: user.email }))} />
    </AdminFrame>
  );
}
