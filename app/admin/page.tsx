import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { AdminFrame, adminCard, adminEyebrow, fmtDateTime, StatusPill } from "./AdminFrame";
import { AuditTable } from "./AuditTable";
import { ReplayButton } from "./AdminActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

const WEBHOOK_FILTERS = ["problems", "all"] as const;
type WebhookFilter = (typeof WEBHOOK_FILTERS)[number];

/** Pull a user id or customer id out of a stored domain event, to link a delivery to its user. */
function eventRefs(payload: string | null): { userId?: string; customerId?: string } {
  if (!payload) return {};
  try {
    const e = JSON.parse(payload) as { userId?: unknown; customerId?: unknown };
    return {
      userId: typeof e.userId === "string" ? e.userId : undefined,
      customerId: typeof e.customerId === "string" ? e.customerId : undefined,
    };
  } catch {
    return {};
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; webhooks?: string }>;
}) {
  if (!(await getAdmin())) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filter: WebhookFilter = WEBHOOK_FILTERS.includes(sp.webhooks as WebhookFilter) ? (sp.webhooks as WebhookFilter) : "problems";

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const userWhere: Prisma.UserWhereInput | null = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { brandProfile: { companyName: { contains: q, mode: "insensitive" } } },
          { id: q },
          { stripeCustomerId: q },
        ],
      }
    : null;

  const [counts, problems7d, results, webhooks, audit] = await Promise.all([
    Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { accountType: "brand" } }),
      prisma.user.count({ where: { compedTier: { not: null } } }),
      prisma.user.count({ where: { stripeCustomerId: { not: null } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    ]),
    prisma.webhookEvent.count({ where: { status: { in: ["failed", "rejected"] }, updatedAt: { gte: weekAgo } } }),
    userWhere
      ? prisma.user.findMany({
          where: userWhere,
          take: 25,
          orderBy: { createdAt: "desc" },
          select: {
            id: true, email: true, name: true, username: true, accountType: true, createdAt: true,
            verifiedTier: true, compedTier: true, stripeCustomerId: true,
            brandProfile: { select: { companyName: true } },
          },
        })
      : Promise.resolve(null),
    prisma.webhookEvent.findMany({
      where: filter === "problems" ? { status: { in: ["failed", "rejected"] } } : {},
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
  ]);
  const [totalUsers, brands, comped, customers, newThisWeek] = counts;

  // Resolve emails for audit targets and webhook customers in two small lookups.
  const refs = webhooks.map((w) => eventRefs(w.payload));
  const customerIds = [...new Set(refs.map((r) => r.customerId).filter((x): x is string => !!x))];
  const userIds = [
    ...new Set([...audit.map((a) => a.targetUserId), ...refs.map((r) => r.userId)].filter((x): x is string => !!x)),
  ];
  const linked = await prisma.user.findMany({
    where: { OR: [{ id: { in: userIds } }, { stripeCustomerId: { in: customerIds } }] },
    select: { id: true, email: true, stripeCustomerId: true },
  });
  const byId = new Map(linked.map((u) => [u.id, u]));
  const byCustomer = new Map(linked.filter((u) => u.stripeCustomerId).map((u) => [u.stripeCustomerId!, u]));

  const stats = [
    { label: "Users", value: totalUsers, sub: `${newThisWeek} new this week` },
    { label: "Creators / brands", value: `${totalUsers - brands} / ${brands}` },
    { label: "Paying customers", value: customers, sub: "have a customer id" },
    { label: "Comped", value: comped },
    { label: "Webhook problems", value: problems7d, sub: "last 7 days", alert: problems7d > 0 },
  ];

  return (
    <AdminFrame
      active="/admin"
      title="Users & ops"
      description={`Look up an account, change its comp, resync its plan from ${payments.id}, and watch payment webhooks.`}
    >
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className={`${adminCard} p-4 ${s.alert ? "border-red-500/40" : ""}`}>
            <div className={adminEyebrow}>{s.label}</div>
            <div className={`mt-1 text-xl font-semibold tabular-nums ${s.alert ? "text-red-700 dark:text-red-400" : ""}`}>{s.value}</div>
            {s.sub && <div className="text-muted-foreground text-xs">{s.sub}</div>}
          </div>
        ))}
      </div>

      <section className={`${adminCard} mt-6 p-5`}>
        <h2 className={adminEyebrow}>Find a user</h2>
        <form className="mt-3 flex gap-2" action="/admin">
          <input
            name="q"
            defaultValue={q}
            placeholder="Email, username, name, company, user id or customer id"
            aria-label="Search users"
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
          />
          {filter !== "problems" && <input type="hidden" name="webhooks" value={filter} />}
          <button className="h-10 rounded-lg bg-foreground px-4 text-sm font-semibold text-background">Search</button>
        </form>
        {results && (
          results.length === 0 ? (
            <p className="text-muted-foreground mt-4 text-sm">No users match “{q}”.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground text-xs">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Account</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Badge</th>
                    <th className="py-2 pr-3 font-medium">Comp</th>
                    <th className="py-2 pr-3 font-medium">Customer</th>
                    <th className="py-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {results.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2 pr-3">
                        <Link href={`/admin/users/${u.id}`} className="font-medium underline-offset-2 hover:underline">
                          {u.email}
                        </Link>
                        <div className="text-muted-foreground text-xs">
                          {u.brandProfile?.companyName ?? u.name ?? "—"}
                          {u.username && ` · @${u.username}`}
                        </div>
                      </td>
                      <td className="py-2 pr-3">{u.accountType}</td>
                      <td className="py-2 pr-3">{u.verifiedTier ?? "—"}</td>
                      <td className="py-2 pr-3">{u.compedTier ?? "—"}</td>
                      <td className="py-2 pr-3">{u.stripeCustomerId ? "yes" : "—"}</td>
                      <td className="text-muted-foreground py-2 text-xs tabular-nums">{fmtDateTime(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>

      <section className={`${adminCard} mt-6 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={adminEyebrow}>Payment webhooks ({payments.id})</h2>
          <div className="flex gap-1 text-xs">
            {WEBHOOK_FILTERS.map((f) => (
              <Link
                key={f}
                href={{ pathname: "/admin", query: { ...(q ? { q } : {}), webhooks: f } }}
                aria-current={f === filter ? "true" : undefined}
                className={`rounded-full px-2.5 py-1 font-medium ${f === filter ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
              >
                {f === "problems" ? "Failed & rejected" : "All"}
              </Link>
            ))}
          </div>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          <strong>failed</strong> = a valid event we couldn’t apply (often: no user for that customer yet). Fix plan state
          with <em>Resync</em> on the user; <em>Replay</em> re-applies the stored event as-is.{" "}
          <strong>rejected</strong> = bad signature, counted per hour: check the webhook secret in the provider dashboard and Vercel.
        </p>
        {webhooks.length === 0 ? (
          <p className="text-muted-foreground mt-4 text-sm">
            {filter === "problems" ? "No failed or rejected deliveries." : "No deliveries logged yet."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground text-xs">
                <tr>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Event</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Detail</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {webhooks.map((w, i) => {
                  const r = refs[i];
                  const user = (r.userId && byId.get(r.userId)) || (r.customerId && byCustomer.get(r.customerId)) || null;
                  return (
                    <tr key={w.id} className="align-top">
                      <td className="text-muted-foreground py-2 pr-3 text-xs tabular-nums">{fmtDateTime(w.updatedAt)}</td>
                      <td className="py-2 pr-3">
                        <span className="font-mono text-xs">{w.providerType ?? w.type}</span>
                        {w.deliveryId && !w.deliveryId.startsWith("rejected:") && (
                          <div className="text-muted-foreground font-mono text-[11px]">{w.deliveryId}</div>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusPill status={w.status} />
                        {w.attempts > 1 && <span className="text-muted-foreground ml-1 text-xs">×{w.attempts}</span>}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {user ? (
                          <Link href={`/admin/users/${user.id}`} className="underline underline-offset-2">{user.email}</Link>
                        ) : (
                          <span className="text-muted-foreground font-mono">{r.customerId ?? r.userId ?? "—"}</span>
                        )}
                      </td>
                      <td className="text-muted-foreground max-w-xs break-words py-2 pr-3 text-xs">{w.error ?? ""}</td>
                      <td className="py-2 text-right">{w.payload && w.status !== "processed" && <ReplayButton id={w.id} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AuditTable rows={audit.map((a) => ({ ...a, targetEmail: a.targetUserId ? byId.get(a.targetUserId)?.email : null }))} />
    </AdminFrame>
  );
}
