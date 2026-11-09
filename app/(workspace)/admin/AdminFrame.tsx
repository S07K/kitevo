import Link from "next/link";
import type { ReactNode } from "react";
import { WorkspaceShell, PageHeader } from "@/app/components/workspace/WorkspaceShell";

/** Shared chrome for /admin pages: the normal workspace shell (sidebar), an "Admin" header and section tabs. */
export const adminCard = "rounded-2xl border border-border bg-background";
export const adminEyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

const TABS = [
  { href: "/admin", label: "Users & ops" },
  { href: "/admin/payouts", label: "Referral payouts" },
  { href: "/admin/reports", label: "Reports" },
] as const;

export function AdminFrame({
  active,
  title,
  description,
  children,
}: {
  active: (typeof TABS)[number]["href"];
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <WorkspaceShell width="wide">
      <nav className="mb-6 flex flex-wrap gap-1 rounded-full bg-muted p-1 text-sm sm:w-fit" aria-label="Admin sections">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${
              t.href === active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <PageHeader eyebrow="Admin" title={title} description={description} />
      {children}
    </WorkspaceShell>
  );
}

/** Fixed locale + zone so the server render and the browser agree. */
const DT_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});
export const fmtDateTime = (d: Date) => `${DT_FMT.format(d)} UTC`;

const STATUS_STYLE: Record<string, string> = {
  processed: "bg-green-500/10 text-green-700 dark:text-green-400",
  ignored: "bg-muted text-muted-foreground",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  rejected: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  // Reports (lib/safety)
  open: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  dismissed: "bg-muted text-muted-foreground",
  actioned: "bg-red-500/10 text-red-700 dark:text-red-400",
};
export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status] ?? STATUS_STYLE.ignored}`}>
      {status}
    </span>
  );
}
