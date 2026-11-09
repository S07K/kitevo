import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { reasonLabel } from "@/lib/safety-shared";
import { AdminFrame, adminCard, fmtDateTime, StatusPill } from "../AdminFrame";
import { ReportActions } from "../AdminActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports · Admin", robots: { index: false, follow: false } };

const display = (u: { name: string | null; email: string; brandProfile: { companyName: string } | null }) => u.brandProfile?.companyName ?? u.name ?? u.email;

/** Where the report was made, in words (ids stay out of the way). */
function contextLabel(ctx: string | null): string {
  if (!ctx) return "—";
  const [kind] = ctx.split(":");
  return { conversation: "Messages", deal: "A deal", campaign: "A campaign", application: "An application", inquiry: "A kit inquiry", profile: "Profile" }[kind] ?? ctx;
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  if (!(await getAdmin())) notFound();
  const show = (await searchParams).show === "closed" ? "closed" : "open";

  const reports = await prisma.userReport.findMany({
    where: show === "open" ? { status: "open" } : { status: { not: "open" } },
    orderBy: show === "open" ? { createdAt: "asc" } : { resolvedAt: "desc" },
    take: 100,
    select: {
      id: true, reason: true, note: true, context: true, status: true, createdAt: true, resolvedBy: true, resolvedAt: true,
      reporter: { select: { id: true, email: true, name: true, brandProfile: { select: { companyName: true } } } },
      reported: { select: { id: true, email: true, name: true, accountType: true, suspendedAt: true, brandProfile: { select: { companyName: true } }, _count: { select: { reportsAgainst: true, blockedBy: true } } } },
    },
  });
  const openCount = show === "open" ? reports.length : await prisma.userReport.count({ where: { status: "open" } });

  return (
    <AdminFrame
      active="/admin/reports"
      title="Reports"
      description="Accounts people reported. Dismiss a report, or suspend the account: they can't sign in, and their kit, profile and campaigns are hidden. Reporters are never shown to the reported account."
    >
      <nav className="mb-4 flex gap-2 text-sm" aria-label="Report filter">
        {(["open", "closed"] as const).map((k) => (
          <Link
            key={k}
            href={k === "open" ? "/admin/reports" : "/admin/reports?show=closed"}
            aria-current={show === k ? "page" : undefined}
            className={`rounded-full border px-3 py-1 font-medium ${show === k ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {k === "open" ? `Open (${openCount})` : "Closed"}
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <p className={`${adminCard} p-6 text-sm text-muted-foreground`}>{show === "open" ? "No open reports." : "No closed reports yet."}</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} id={r.id} className={`${adminCard} scroll-mt-24 p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">
                    <Link href={`/admin/users/${r.reported.id}`} className="font-semibold underline-offset-2 hover:underline">{display(r.reported)}</Link>{" "}
                    <span className="text-muted-foreground">· {r.reported.accountType} · {r.reported.email}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.reported._count.reportsAgainst} report{r.reported._count.reportsAgainst === 1 ? "" : "s"} in total · blocked by {r.reported._count.blockedBy}
                    {r.reported.suspendedAt && <span className="font-semibold text-red-700 dark:text-red-400"> · suspended</span>}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Reason</dt>
                  <dd className="mt-0.5 font-medium">{reasonLabel(r.reason)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Where</dt>
                  <dd className="mt-0.5">{contextLabel(r.context)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Reported by</dt>
                  <dd className="mt-0.5 break-words">
                    <Link href={`/admin/users/${r.reporter.id}`} className="underline-offset-2 hover:underline">{display(r.reporter)}</Link> · {fmtDateTime(r.createdAt)}
                  </dd>
                </div>
              </dl>
              {r.note && <p className="mt-3 whitespace-pre-line rounded-xl bg-muted/50 p-3 text-sm leading-relaxed">{r.note}</p>}
              <div className="mt-4 border-t border-border pt-3">
                {r.status === "open" ? (
                  <ReportActions id={r.id} name={display(r.reported)} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {r.status === "actioned" ? "Account suspended" : "Dismissed"}
                    {r.resolvedBy ? ` by ${r.resolvedBy}` : ""}
                    {r.resolvedAt ? ` · ${fmtDateTime(r.resolvedAt)}` : ""}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminFrame>
  );
}
