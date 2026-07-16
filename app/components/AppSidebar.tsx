"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type SidebarTab = { href: string; label: string; badge?: number; icon?: ReactNode };

export function AppSidebar({ tabs }: { tabs: SidebarTab[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-border bg-background fixed top-[57px] bottom-0 left-0 z-40">
        <nav className="flex flex-col gap-0.5 p-3 pt-5">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(t.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                {t.icon && <span className="shrink-0 opacity-80">{t.icon}</span>}
                <span className="truncate">{t.label}</span>
              </span>
              {t.badge && t.badge > 0 ? (
                <span className="h-5 min-w-5 px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 border-t border-border backdrop-blur-md flex">
        {tabs.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.badge && t.badge > 0 ? (
                <span className="absolute top-1.5 right-1/4 translate-x-2 h-4 min-w-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              ) : null}
              {t.icon && <span className="shrink-0">{t.icon}</span>}
              <span>{t.label}</span>
              {active && <span className="h-0.5 w-5 rounded-full bg-foreground" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
