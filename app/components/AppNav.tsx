"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

type NavLink = { href: string; label: string; primary?: boolean; external?: boolean };
type NavTab = { href: string; label: string; badge?: number };

export function AppNav({
  links,
  onLogout,
  tabs,
}: {
  links: NavLink[];
  onLogout?: () => void;
  tabs?: NavTab[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isTabActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="bg-background/95 border-border fixed left-0 right-0 top-0 z-50 flex items-center gap-6 border-b px-5 backdrop-blur-md sm:px-8" style={{ height: 57 }}>
      <Link
        href="/"
        className="font-display text-foreground shrink-0 text-lg font-semibold tracking-tight transition-opacity hover:opacity-70"
        onClick={() => setMenuOpen(false)}
      >
        Kitevo
      </Link>

      {/* Tabs — left-aligned after logo, desktop only */}
      {tabs && tabs.length > 0 && (
        <div className="hidden items-center gap-1 md:flex">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`relative h-9 rounded-full px-4 text-sm font-medium transition-colors ${
                isTabActive(t.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.badge && t.badge > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}

      {/* Desktop links — pushed to the right */}
      <div className="hidden items-center gap-2 md:flex ml-auto">
        {links.map((link) => {
          const key = `${link.href}-${link.label}`;
          const base = link.primary
            ? "bg-foreground text-background inline-flex h-9 items-center rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-80"
            : "text-muted-foreground hover:text-foreground inline-flex h-9 items-center px-3 text-sm transition-colors";
          if (link.external) {
            return (
              <a key={key} href={link.href} target="_blank" rel="noopener noreferrer" className={base}>
                {link.label}
              </a>
            );
          }
          return (
            <Link key={key} href={link.href} className={base}>
              {link.label}
            </Link>
          );
        })}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground inline-flex h-9 items-center px-3 text-sm transition-colors"
          >
            Log out
          </button>
        )}
        <ThemeToggle />
      </div>

      {/* Mobile menu button */}
      <button
        type="button"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
        className="text-foreground hover:bg-muted ml-auto -mr-2 rounded-lg p-2 transition-colors md:hidden"
      >
        {menuOpen ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 top-[57px] z-40 bg-black/10 md:hidden"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
          <div className="bg-background border-border fixed left-4 right-4 top-[65px] z-50 flex flex-col gap-1 rounded-2xl border p-3 shadow-xl md:hidden">
            {tabs && tabs.length > 0 && (
              <>
                {tabs.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      isTabActive(t.href) ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {t.label}
                    {t.badge && t.badge > 0 ? (
                      <span className="ml-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {t.badge > 9 ? "9+" : t.badge}
                      </span>
                    ) : null}
                  </Link>
                ))}
                <div className="my-1 border-t border-border" />
              </>
            )}
            {links.map((link) => {
              const key = `${link.href}-${link.label}`;
              const cls = link.primary
                ? "bg-foreground text-background flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium"
                : "text-foreground hover:bg-muted flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition-colors";
              if (link.external) {
                return (
                  <a key={key} href={link.href} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} className={cls}>
                    {link.label}
                  </a>
                );
              }
              return (
                <Link key={key} href={link.href} onClick={() => setMenuOpen(false)} className={cls}>
                  {link.label}
                </Link>
              );
            })}
            {onLogout && (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onLogout(); }}
                className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition-colors"
              >
                Log out
              </button>
            )}
          </div>
        </>
      )}
    </nav>
  );
}
