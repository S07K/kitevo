"use client";

import Link from "next/link";
import { useState } from "react";

type NavLink = { href: string; label: string; primary?: boolean; external?: boolean };

export function AppNav({ links }: { links: NavLink[] }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 flex items-center justify-between bg-[#FAF9F7]/95 backdrop-blur-md border-b border-[#E8E6E3]">
      <Link
        href="/"
        className="font-display text-xl font-semibold tracking-tight text-[#1A1A1A] shrink-0"
        onClick={() => setMenuOpen(false)}
      >
        Media Kit Pro
      </Link>

      {/* Desktop: horizontal links with comfortable spacing */}
      <div className="hidden md:flex items-center gap-6">
        {links.map((link) => {
          const key = `${link.href}-${link.label}`;
          const className = link.primary
            ? "px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D] transition-colors whitespace-nowrap"
            : "text-sm text-[#5C5C5C] hover:text-[#1A1A1A] transition-colors whitespace-nowrap";
          if (link.external) {
            return (
              <a
                key={key}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {link.label}
              </a>
            );
          }
          return (
            <Link key={key} href={link.href} className={className}>
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Mobile: menu button */}
      <button
        type="button"
        aria-label="Toggle menu"
        onClick={() => setMenuOpen((o) => !o)}
        className="md:hidden p-2 -mr-2 rounded-sm text-[#1A1A1A] hover:bg-[#E8E6E3] transition-colors"
      >
        {menuOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile: dropdown menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 top-[calc(4rem+env(safe-area-inset-top))] z-40 bg-black/20 md:hidden"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed right-4 left-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 md:hidden py-4 px-4 rounded-lg bg-white border border-[#E8E6E3] shadow-lg flex flex-col gap-1">
            {links.map((link) => {
              const key = `${link.href}-${link.label}`;
              const className = `block py-3 px-4 rounded-sm text-center text-sm font-medium transition-colors ${
                link.primary ? "bg-[#1A1A1A] text-white hover:bg-[#2D2D2D]" : "text-[#1A1A1A] hover:bg-[#F5F5F5]"
              }`;
              if (link.external) {
                return (
                  <a
                    key={key}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className={className}
                  >
                    {link.label}
                  </a>
                );
              }
              return (
                <Link key={key} href={link.href} onClick={() => setMenuOpen(false)} className={className}>
                  {link.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </nav>
  );
}
