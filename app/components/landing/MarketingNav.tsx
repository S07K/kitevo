"use client";

import { softEase, useReducedMotion } from "@/lib/motion";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Vibes", href: "#vibes" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function MarketingNav(): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuOpen(false); toggleRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          {/* Logo */}
          <Link
            href="/"
            className="focus-ring font-display text-foreground shrink-0 rounded-sm text-lg font-semibold tracking-tight transition-opacity hover:opacity-70"
          >
            Media Kit Pro
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="focus-ring text-muted-foreground hover:text-foreground rounded-full px-4 py-2 text-sm font-medium transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right: CTA + hamburger */}
          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="focus-ring bg-foreground text-background hidden h-10 items-center rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-80 md:inline-flex"
            >
              Get started free
            </Link>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="focus-ring text-foreground hover:bg-muted -mr-1 flex h-10 w-10 flex-col items-center justify-center gap-[6px] rounded-full transition-colors md:hidden"
            >
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.28, ease: softEase }}
                className="bg-current block h-px w-5 origin-center"
              />
              <motion.span
                animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.2 }}
                className="bg-current block h-px w-5"
              />
              <motion.span
                animate={menuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.28, ease: softEase }}
                className="bg-current block h-px w-5 origin-center"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.3, ease: softEase }}
            className="bg-background fixed inset-0 z-40 flex flex-col px-6 pt-24 pb-10 md:hidden"
          >
            <nav className="flex flex-1 flex-col gap-1">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.35, ease: softEase, delay: 0.05 + i * 0.05 }}
                  className="focus-ring text-foreground -mx-3 rounded-xl px-3 py-3.5 text-2xl font-medium tracking-tight transition-colors hover:bg-muted"
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.35, ease: softEase, delay: 0.25 }}
              className="space-y-3"
            >
              <div className="border-border border-t pt-6">
                <div className="flex gap-4 text-sm">
                  <Link href="/privacy" onClick={close} className="focus-ring text-muted-foreground hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                  <Link href="/terms" onClick={close} className="focus-ring text-muted-foreground hover:text-foreground transition-colors">
                    Terms
                  </Link>
                </div>
              </div>
              <Link
                href="/signup"
                onClick={close}
                className="focus-ring bg-foreground text-background flex h-13 w-full items-center justify-center rounded-2xl text-base font-medium transition-opacity hover:opacity-80"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                onClick={close}
                className="focus-ring text-muted-foreground flex h-12 w-full items-center justify-center rounded-2xl text-sm font-medium transition-colors hover:bg-muted"
              >
                Log in
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
