"use client";

import Link from "next/link";
import { useState } from "react";

type NavLink = { href: string; label: string; primary?: boolean; external?: boolean };

export function AppNav({ links, onLogout }: { links: NavLink[]; onLogout?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-background/95 border-border fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b px-5 py-4 backdrop-blur-md sm:px-8">
      <Link
        href="/"
        className="font-display text-foreground shrink-0 text-lg font-semibold tracking-tight transition-opacity hover:opacity-70"
        onClick={() => setMenuOpen(false)}
      >
        Media Kit Pro
      </Link>

      {/* Desktop links */}
      <div className="hidden items-center gap-2 md:flex">
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
      </div>

      {/* Mobile menu button */}
      <button
        type="button"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
        className="text-foreground hover:bg-muted -mr-2 rounded-lg p-2 transition-colors md:hidden"
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
