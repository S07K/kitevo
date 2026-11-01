import Link from "next/link";
import type { ReactNode } from "react";
import { AppNav } from "@/app/components/AppNav";

/** Shared chrome for /admin pages: top nav, section tabs, title. Admin-only, so plain on purpose. */
export const adminCard = "rounded-2xl border border-border bg-background";
export const adminEyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

const TABS = [
  { href: "/admin", label: "Users & ops" },
  { href: "/admin/payouts", label: "Referral payouts" },
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
    <div className="min-h-screen bg-muted/20">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-8">
        <nav className="mb-6 flex gap-1 text-sm" aria-label="Admin sections">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={t.href === active ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                t.href === active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
        {children}
      </main>
    </div>
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
};
export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status] ?? STATUS_STYLE.ignored}`}>
      {status}
    </span>
  );
}
