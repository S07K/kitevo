"use client";

import { softEase, useIsDesktop, useReducedMotion } from "@/lib/motion";
import { AnimatePresence, motion, type Variants } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Vibes", href: "#vibes" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

const ITEM_DELAY = 0.1;
const ITEM_STAGGER = 0.04;

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      opacity: { duration: 0.4, ease: softEase, delay: ITEM_DELAY + i * ITEM_STAGGER },
      y: { type: "spring", stiffness: 400, damping: 40, delay: ITEM_DELAY + i * ITEM_STAGGER },
    },
  }),
};

function MenuIcon({ open }: { open: boolean }): ReactNode {
  return (
    <span className="flex h-4 w-4 flex-col justify-center gap-[5px]" aria-hidden>
      <motion.span
        animate={open ? { rotate: 45, y: 4.5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.3, ease: softEase }}
        className="bg-current block h-px w-full origin-center"
      />
      <motion.span
        animate={open ? { rotate: -45, y: -4.5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.3, ease: softEase }}
        className="bg-current block h-px w-full origin-center"
      />
    </span>
  );
}

export function MarketingNav(): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const CLOSED_WIDTH = isDesktop ? 180 : 120;
  const OPEN_WIDTH = 288;

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeMenu = (): void => setMenuOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="relative flex h-20 items-center justify-between px-5 sm:px-8 lg:px-10">
        {/* Logo */}
        <Link href="/" className="focus-ring flex items-center gap-2 rounded-sm">
          <span className="font-display text-foreground text-xl font-semibold tracking-tight">
            Media Kit Pro
          </span>
        </Link>

        {/* Desktop pill nav */}
        <nav className="bg-background border-border hidden h-12 items-center gap-1 rounded-full border px-1.5 md:flex">
          {NAV_LINKS.slice(0, 3).map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="focus-ring text-muted-foreground hover:text-foreground flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: menu pill + CTA */}
        <div className="flex items-center gap-3">
          {/* Expandable menu */}
          <div className="absolute top-2 right-5 z-50 md:static md:top-auto md:right-auto">
            <motion.div
              initial={false}
              animate={{
                width: menuOpen ? OPEN_WIDTH : CLOSED_WIDTH,
                boxShadow: menuOpen
                  ? "0 24px 60px -20px rgba(0,0,0,0.2)"
                  : "0 0 0 0 rgba(0,0,0,0)",
              }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.01 }
                  : { duration: 0.4, ease: softEase }
              }
              className="relative rounded-[26px] p-2"
            >
              <motion.div
                initial={false}
                animate={{ opacity: menuOpen ? 1 : 0 }}
                transition={{ duration: 0.3, ease: softEase }}
                className="bg-background border-border pointer-events-none absolute inset-0 rounded-[26px] border"
              />
              <div className="relative">
                <div
                  style={{ backgroundColor: "var(--surface)", color: "var(--surface-foreground)" }}
                  className="flex h-11 w-full items-center justify-end gap-2 rounded-full pl-4 pr-1.5"
                >
                  <button
                    ref={toggleRef}
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-expanded={menuOpen}
                    aria-label={menuOpen ? "Close menu" : "Open menu"}
                    className="focus-ring flex items-center gap-2.5 rounded-full px-2 py-1.5 text-sm font-medium transition-opacity hover:opacity-75"
                  >
                    <MenuIcon open={menuOpen} />
                    <span className="text-xs font-medium tracking-wide">
                      {menuOpen ? "Close" : "Menu"}
                    </span>
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {menuOpen && (
                    <motion.div
                      key="panel"
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0.01 }
                          : { duration: 0.4, ease: softEase }
                      }
                      className="overflow-hidden"
                    >
                      <motion.div
                        initial={prefersReducedMotion ? false : "hidden"}
                        animate={prefersReducedMotion ? false : "visible"}
                        className="px-4 pt-6 pb-4"
                        style={{ width: OPEN_WIDTH - 16 }}
                      >
                        <div className="flex flex-col gap-1.5">
                          <motion.span
                            custom={0}
                            variants={ITEM_VARIANTS}
                            className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-widest uppercase"
                          >
                            Menu
                          </motion.span>
                          {NAV_LINKS.map((link, i) => (
                            <motion.a
                              key={link.href}
                              href={link.href}
                              onClick={closeMenu}
                              custom={1 + i}
                              variants={ITEM_VARIANTS}
                              className="focus-ring text-foreground hover:text-foreground/60 w-fit text-2xl font-medium tracking-tight transition-colors"
                            >
                              {link.label}
                            </motion.a>
                          ))}
                        </div>

                        <motion.div
                          custom={5}
                          variants={ITEM_VARIANTS}
                          className="bg-border my-5 h-px w-full"
                        />

                        <div className="flex flex-col gap-2.5">
                          <motion.span
                            custom={6}
                            variants={ITEM_VARIANTS}
                            className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase"
                          >
                            Legal
                          </motion.span>
                          {LEGAL_LINKS.map((link, i) => (
                            <motion.a
                              key={link.href}
                              href={link.href}
                              onClick={closeMenu}
                              custom={7 + i}
                              variants={ITEM_VARIANTS}
                              className="focus-ring text-foreground/75 hover:text-foreground w-fit text-sm font-medium transition-colors"
                            >
                              {link.label}
                            </motion.a>
                          ))}
                        </div>

                        <motion.div custom={9} variants={ITEM_VARIANTS} className="mt-6">
                          <Link
                            href="/signup"
                            onClick={closeMenu}
                            className="focus-ring bg-foreground text-background inline-flex h-10 items-center rounded-full px-6 text-sm font-medium"
                          >
                            Get started free
                          </Link>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          <Link
            href="/signup"
            className="focus-ring bg-foreground text-background hidden h-11 items-center rounded-full px-6 text-sm font-medium transition-opacity hover:opacity-80 md:inline-flex"
          >
            Get started free
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 -z-10 cursor-default"
          />
        )}
      </AnimatePresence>
    </header>
  );
}
