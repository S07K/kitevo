"use client";

import { softEase, useReducedMotion } from "@/lib/motion";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiInstagram } from "@icons-pack/react-simple-icons";
import { Megaphone, SquareKanban, Tag } from "lucide-react";
import { REFERRAL_RATE_PCT } from "@/lib/referral-terms";
import { Bubble, Cutout, ExampleTag, KitMock, PhoneFrame, type KitLook } from "./cutouts";

const HERO_KIT: KitLook = {
  name: "Maya Okafor",
  handle: "maya.makes",
  niche: "Beauty",
  initials: "MO",
  bg: "#f7efe7",
  fg: "#3a2a20",
  accent: "#c97b4b",
  accentFg: "#ffffff",
  followers: "48.2K",
  engagement: "5.8%",
  platform: "instagram",
  rates: [
    { label: "Instagram Reel", price: "$450" },
    { label: "Story set (3)", price: "$220" },
  ],
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
    <section className="relative px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="relative rounded-[36px] bg-[#1b365d] text-white sm:rounded-[48px]">
        {/* Soft sky glow behind the phone; decoration only. */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          aria-hidden
        >
          <div className="absolute -right-24 top-10 h-[520px] w-[520px] rounded-full bg-[#60c1e5]/25 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-6 pb-0 pt-28 sm:px-10 sm:pt-32 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-16 lg:pt-36">
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
            <p className="mt-5 text-sm text-white/60">
              Free plan, no card needed.{" "}
              <Link href="/referral-program" className="text-white/85 underline decoration-white/30 underline-offset-4 hover:decoration-white">
                Earn {REFERRAL_RATE_PCT}% when creators you invite upgrade.
              </Link>
            </p>
          </div>

          {/* Cutout composition. It hangs below the band on large screens (translate-y). */}
          <div className="relative mx-auto h-[500px] w-full max-w-[520px] sm:h-[560px] lg:h-[600px] lg:translate-y-24" aria-hidden>
            <motion.div
              className="absolute left-1/2 top-4 w-[230px] -translate-x-1/2 sm:w-[260px]"
              initial={reduce ? false : { opacity: 0, y: 40, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: -5 }}
              transition={{ duration: 0.9, ease: softEase, delay: 0.15 }}
            >
              <PhoneFrame>
                <KitMock look={HERO_KIT} />
              </PhoneFrame>
            </motion.div>

            {/* New inquiry: the moment that pays */}
            <Pop i={0} reduce={reduce} className="absolute bottom-16 left-0 w-[230px] sm:bottom-10 sm:w-[250px] lg:-left-6">
              <Cutout className="p-4" style={{ transform: "rotate(-2deg)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">New inquiry</p>
                  <ExampleTag />
                </div>
                <div className="mt-3 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e3f4fa] text-xs font-bold text-[#005a9c]">G</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">Glowfield Skincare</p>
                    <p className="text-[11px] text-[#556b84]">1 Reel + 3 Stories</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#f3f7fa] px-3 py-2">
                  <span className="text-[11px] text-[#556b84]">Budget</span>
                  <span className="text-sm font-semibold tabular-nums">$1,200</span>
                </div>
              </Cutout>
            </Pop>

            {/* Kit getting attention */}
            <Pop i={1} reduce={reduce} className="absolute right-0 top-24 hidden w-[190px] sm:right-2 sm:block sm:w-[200px]">
              <Cutout className="p-3.5" style={{ transform: "rotate(3deg)" }}>
                <p className="text-[11px] text-[#556b84]">Kit views this week</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums">1,284</p>
                <div className="mt-2 flex h-8 items-end gap-1" aria-hidden>
                  {[30, 45, 38, 60, 52, 78, 92].map((h, i) => (
                    <span key={i} className="flex-1 rounded-sm bg-[#60c1e5]" style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }} />
                  ))}
                </div>
              </Cutout>
            </Pop>

            {/* Feature bubbles: the four ways Kitevo gets creators paid */}
            <Pop i={2} reduce={reduce} className="absolute -left-2 top-2 hidden w-[112px] sm:block lg:left-2">
              <Bubble icon={<SiInstagram size={16} color="#E4405F" />} label="Live stats" />
            </Pop>
            <Pop i={3} reduce={reduce} className="absolute bottom-0 right-6 w-[104px] sm:right-0 sm:w-[118px]">
              <Bubble icon={<SquareKanban size={17} className="text-[#005a9c]" />} label="Deal pipeline" />
            </Pop>
            <Pop i={4} reduce={reduce} className="absolute -left-4 top-[42%] hidden w-[96px] lg:block xl:-left-12">
              <Bubble icon={<Tag size={16} className="text-[#005a9c]" />} label="Rate card" />
            </Pop>
            <Pop i={5} reduce={reduce} className="absolute -right-6 bottom-40 hidden w-[100px] lg:block">
              <Bubble icon={<Megaphone size={16} className="text-[#005a9c]" />} label="Brand campaigns" />
            </Pop>
          </div>
        </div>
      </div>
      {/* Room for the composition that hangs below the band */}
      <div className="hidden h-24 lg:block" aria-hidden />
    </section>
  );
}
