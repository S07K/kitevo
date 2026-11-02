"use client";

import { softEase, useReducedMotion } from "@/lib/motion";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { LogoMark } from "@/app/components/Logo";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { REFERRAL_RATE_PCT } from "@/lib/referral-terms";

type NavUser = { name: string | null; avatarUrl: string | null; username: string | null; accountType: string | null } | null;

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  // A real page, not an in-page anchor. Rendered with <a> like the rest, which is fine:
  // it is a full navigation away from the landing page either way.
  { label: "Live example", href: "/kit/demo" },
  { label: "Ways to earn", href: "#ways-to-earn" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "/blog" },
  { label: `Earn ${REFERRAL_RATE_PCT}%`, href: "/referral-program" },
  { label: "FAQ", href: "#faq" },
];

/**
 * `overDark`: the page opens on a dark band (the homepage hero). Until the visitor scrolls,
 * the header renders in the dark token set (class "dark" flips every token inside it), so
 * logo, links and buttons stay legible on navy without per-element overrides.
 */
export function MarketingNav({ overDark = false }: { overDark?: boolean } = {}): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [user, setUser] = useState<NavUser>(undefined as unknown as NavUser);

  useEffect(() => {
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d ? { name: d.name ?? null, avatarUrl: d.avatarUrl ?? null, username: d.username ?? null, accountType: d.accountType ?? null } : null))
      .catch(() => setUser(null));
  }, []);

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
  const dashHref = user?.accountType === "brand" ? "/discover" : "/dashboard";
  const displayName = user?.name ?? user?.username ?? "Dashboard";

  return (
    <>
      <header
        // top offset = launch-banner height (0 when no banner) so the nav sits below it.
        style={{ top: "var(--ph-banner, 0px)" }}
        className={[
          "fixed inset-x-0 z-50 transition-all duration-300",
          scrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-transparent",
          overDark && !scrolled && !menuOpen ? "dark" : "",
        ].join(" ")}
      >
        <div className="mx-auto flex h-[57px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          {/* Logo */}
          <Link
            href="/"
            className="focus-ring font-display text-foreground flex shrink-0 items-center gap-2 rounded-sm text-lg font-semibold tracking-tight transition-opacity hover:opacity-70"
          >
            {/* `auto` = top impression inherits text-foreground, so it flips with the theme. */}
            <LogoMark size={22} on="auto" />
            Kitevo
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="focus-ring text-muted-foreground hover:text-foreground whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden md:inline-flex" />

            {/* Desktop auth / avatar */}
            {user === (undefined as unknown as NavUser) ? (
              <span className="hidden md:inline-flex h-9 w-24 rounded-full bg-muted/40 animate-pulse" />
            ) : user ? (
              <Link
                href={dashHref}
                className="hidden md:inline-flex items-center gap-2.5 rounded-full border border-border px-2 pr-4 py-1 hover:bg-muted transition-colors"
              >
                <div className="h-7 w-7 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="max-w-[160px] truncate whitespace-nowrap text-sm font-medium text-foreground">{displayName}</span>
              </Link>
            ) : (
              <>
                <Link href="/login" className="focus-ring text-muted-foreground hover:text-foreground hidden whitespace-nowrap text-sm font-medium transition-colors md:inline-flex">
                  Log in
                </Link>
                <Link href="/signup" className="focus-ring bg-primary text-primary-foreground hidden h-9 items-center whitespace-nowrap rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-80 md:inline-flex">
                  Get started free
                </Link>
              </>
            )}

            {/* Hamburger — mobile only */}
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="focus-ring text-foreground hover:bg-muted flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-full transition-colors xl:hidden"
            >
              <motion.span animate={menuOpen ? { rotate: 45, y: 4.5 } : { rotate: 0, y: 0 }} transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.25, ease: softEase }} className="bg-current block h-px w-4.5 origin-center" />
              <motion.span animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }} transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.18 }} className="bg-current block h-px w-4.5" />
              <motion.span animate={menuOpen ? { rotate: -45, y: -4.5 } : { rotate: 0, y: 0 }} transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.25, ease: softEase }} className="bg-current block h-px w-4.5 origin-center" />
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
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.25, ease: softEase }}
            className="bg-background fixed inset-0 z-40 flex flex-col xl:hidden"
            style={{ paddingTop: 57 }}
          >
            <div className="flex flex-1 flex-col overflow-y-auto px-5 pt-6 pb-8">

              {/* User card (logged in) */}
              {user && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: softEase }}
                  className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Signed in as</p>
                      <p className="text-sm font-semibold text-foreground">{displayName}</p>
                    </div>
                  </div>
                  <Link
                    href={dashHref}
                    onClick={close}
                    className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Dashboard
                  </Link>
                </motion.div>
              )}

              {/* Nav links */}
              <nav className="flex flex-col gap-0.5">
                {NAV_LINKS.map((link, i) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.3, ease: softEase, delay: 0.04 + i * 0.04 }}
                    className="flex items-center rounded-xl px-3 py-3.5 text-xl font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {link.label}
                  </motion.a>
                ))}
              </nav>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Bottom CTA */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.3, ease: softEase, delay: 0.2 }}
                className="space-y-2.5 pt-6 border-t border-border"
              >
                {user ? (
                  <Link
                    href={dashHref}
                    onClick={close}
                    className="focus-ring bg-primary text-primary-foreground flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      onClick={close}
                      className="focus-ring bg-primary text-primary-foreground flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80"
                    >
                      Get started free
                    </Link>
                    <Link
                      href="/login"
                      onClick={close}
                      className="focus-ring text-muted-foreground flex h-11 w-full items-center justify-center rounded-2xl text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Log in
                    </Link>
                  </>
                )}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <Link href="/privacy" onClick={close} className="hover:text-foreground transition-colors">Privacy</Link>
                    <Link href="/terms" onClick={close} className="hover:text-foreground transition-colors">Terms</Link>
                  </div>
                  <ThemeToggle />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
