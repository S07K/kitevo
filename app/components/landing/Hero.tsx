"use client";

import { softEase, useReducedMotion } from "@/lib/motion";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiInstagram } from "@icons-pack/react-simple-icons";
import { Megaphone, SquareKanban, Tag } from "lucide-react";
import { REFERRAL_RATE_PCT } from "@/lib/referral-terms";
import { KitCard, type KitLook } from "./cutouts";

const HERO_KIT: KitLook = {
  name: "Maya Okafor",
  handle: "maya.makes",
  niche: "Beauty",
  initials: "MO",
  bg: "#ffffff",
  fg: "#1b365d",
  accent: "#005a9c",
  accentFg: "#ffffff",
  followers: "48.2K",
  second: "5.8%",
  platform: "instagram",
  rates: [
    { label: "Instagram Reel", price: "$450" },
    { label: "Story set (3)", price: "$220" },
  ],
};

/** Same kit in the dark theme: midnight card, sky accents. */
const HERO_KIT_DARK: KitLook = {
  ...HERO_KIT,
  bg: "#13233a",
  fg: "#f5f8fc",
  accent: "#60c1e5",
  accentFg: "#0b1a2e",
};

/** One orchestrated entrance: the phone rises, then the cutouts land around it. */
function Pop({ i, children, className = "", reduce }: { i: number; children: ReactNode; className?: string; reduce: boolean }) {
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: softEase, delay: 0.45 + i * 0.12 }}
    >
      {children}
    </motion.div>
  );
}

export function Hero(): ReactNode {
  const reduce = useReducedMotion();

  return (
    // Full-bleed at the top so the fixed nav sits entirely on navy (no straddled edge);
    // only the bottom corners round off into the page.
    <section className="relative">
      {/* Light: brand navy band. Dark: deeper midnight band with a second glow and a hairline
          sky edge, so the hero reads as its own scene in each theme. Dot grid in both. */}
      <div className="relative rounded-b-[36px] bg-[#1b365d] text-white sm:rounded-b-[56px] dark:bg-[#0c1626] dark:shadow-[0_1px_0_0_rgba(96,193,229,0.35)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
          <div data-bleed className="absolute -right-24 top-10 h-[520px] w-[520px] rounded-full bg-[#60c1e5]/25 blur-3xl dark:bg-[#60c1e5]/30" />
          <div data-bleed className="absolute -bottom-40 -left-32 hidden h-[420px] w-[420px] rounded-full bg-[#a0e0ef]/15 blur-3xl dark:block" />
          {/* Dot grid in both themes; dots a touch stronger on the lighter navy band. */}
          <div
            className="absolute inset-0 opacity-100 dark:opacity-80"
            style={{
              backgroundImage: "radial-gradient(rgba(160,224,239,0.2) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
              maskImage: "linear-gradient(to left, black 10%, transparent 75%)",
              WebkitMaskImage: "linear-gradient(to left, black 10%, transparent 75%)",
            }}
          />
        </div>

        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-6 pb-4 pt-28 sm:px-10 sm:pt-32 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:pb-20 lg:pt-36">
          {/* Copy */}
          <div className="max-w-xl">
            {/* Names the product and what it is above the fold (Google OAuth branding review). */}
            <p className="text-sm text-white/70">Kitevo is the media kit built to win brand deals.</p>
            <h1 className="mt-4 text-[clamp(38px,6vw,72px)] font-medium leading-[1.02] tracking-[-0.03em] text-balance">
              Get paid by brands for the audience you already built.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
              Live stats, your rates and a brand inquiry inbox in one link. Brands see real numbers and reach out; you track every
              deal until it&apos;s won.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="focus-ring inline-flex h-13 items-center justify-center rounded-full bg-[#60c1e5] px-8 text-sm font-semibold text-[#0e1c30] transition-colors hover:bg-[#a0e0ef]"
              >
                Start free
              </Link>
              <Link
                href="/kit/demo"
                className="focus-ring inline-flex h-13 items-center justify-center rounded-full border border-white/25 px-8 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                See a live kit
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="What's in Kitevo">
              {[
                { icon: <SiInstagram size={13} aria-hidden />, label: "Live stats" },
                { icon: <Tag size={14} aria-hidden />, label: "Rate card" },
                { icon: <Megaphone size={14} aria-hidden />, label: "Brand campaigns" },
                { icon: <SquareKanban size={14} aria-hidden />, label: "Deal pipeline" },
              ].map((f) => (
                <li key={f.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/85">
                  {f.icon}
                  {f.label}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-white/60">
              Free plan, no card needed.{" "}
              <Link href="/referral-program" className="text-white/85 underline decoration-white/30 underline-offset-4 hover:decoration-white">
                Earn {REFERRAL_RATE_PCT}% when creators you invite upgrade.
              </Link>
            </p>
          </div>

          {/* Visual: the kit, plus what it brings in. Laid out so nothing overlaps content:
              xl = kit card + a column of two cards beside it; below xl = cards under the kit. */}
          <div className="mx-auto w-full max-w-[560px] pb-12 lg:pb-0" aria-hidden>
            <div className="flex flex-col items-center gap-4 xl:flex-row xl:items-center xl:gap-4">
              <motion.div
                className="w-full max-w-[340px] xl:w-[320px] xl:shrink-0"
                initial={reduce ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: softEase, delay: 0.15 }}
              >
                <KitCard look={HERO_KIT} className="dark:hidden" style={{ transform: "rotate(-2deg)" }} />
                <KitCard look={HERO_KIT_DARK} className="hidden dark:block" style={{ transform: "rotate(-2deg)" }} />
              </motion.div>

              <div className="grid w-full max-w-[340px] grid-cols-1 gap-4 sm:max-w-[440px] sm:grid-cols-2 xl:w-[204px] xl:max-w-none xl:grid-cols-1">
                <Pop i={0} reduce={reduce}>
                  <div className="rounded-2xl border border-black/5 bg-white p-4 text-[#1b365d] shadow-[0_18px_40px_-12px_rgba(27,54,93,0.35)] dark:border-white/10 dark:bg-[#13233a] dark:text-[#f5f8fc] dark:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]" style={{ transform: "rotate(2deg)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">New inquiry</p>
                    </div>
                    <p className="mt-2.5 truncate text-sm font-semibold">Glowfield Skincare</p>
                    <p className="truncate text-xs text-[#556b84] dark:text-[#b3c3d6]">1 Reel + 3 Stories</p>
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#f3f7fa] px-3 py-2 dark:bg-white/5">
                      <span className="text-xs text-[#556b84] dark:text-[#b3c3d6]">Budget</span>
                      <span className="text-sm font-semibold tabular-nums">$1,200</span>
                    </div>
                  </div>
                </Pop>
                <Pop i={1} reduce={reduce} className="hidden sm:block">
                  <div className="rounded-2xl border border-black/5 bg-white p-4 text-[#1b365d] shadow-[0_18px_40px_-12px_rgba(27,54,93,0.35)] dark:border-white/10 dark:bg-[#13233a] dark:text-[#f5f8fc] dark:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]" style={{ transform: "rotate(-1.5deg)" }}>
                    <p className="text-xs text-[#556b84] dark:text-[#b3c3d6]">Kit views this week</p>
                    <p className="mt-0.5 text-2xl font-semibold tabular-nums">1,284</p>
                    <div className="mt-2.5 flex h-9 items-end gap-1">
                      {[30, 45, 38, 60, 52, 78, 92].map((h, i) => (
                        <span key={i} className="flex-1 rounded-sm bg-[#60c1e5]" style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }} />
                      ))}
                    </div>
                  </div>
                </Pop>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
