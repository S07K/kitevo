"use client";

import { softEase, useReducedMotion } from "@/lib/motion";
import { motion, useScroll, useTransform, type Variants } from "motion/react";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { REFERRAL_RATE_PCT } from "@/lib/referral-terms";

const HEADLINE = "Your media kit should close deals";
const WORDS = HEADLINE.split(" ");

const WORD_CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const WORD_ITEM: Variants = {
  hidden: { y: "110%" },
  visible: { y: 0, transition: { duration: 0.75, ease: softEase } },
};

type KitCard = {
  vibe: string;
  bg: string;
  accent: string;
  label: string;
  top: string;
  left?: string;
  right?: string;
  rotate: number;
  scale: number;
};

const KIT_CARDS: KitCard[] = [
  {
    vibe: "Editorial",
    bg: "#111110",
    accent: "#f5f0e8",
    label: "@natalierose",
    top: "8%",
    left: "3%",
    rotate: -6,
    scale: 0.82,
  },
  {
    vibe: "Studio",
    bg: "#f0eeeb",
    accent: "#2d2d2b",
    label: "@alexchen",
    top: "18%",
    right: "2%",
    rotate: 5,
    scale: 0.88,
  },
  {
    vibe: "Bloom",
    bg: "#f5ede4",
    accent: "#8b4513",
    label: "@saraamir",
    top: "55%",
    left: "5%",
    rotate: -4,
    scale: 0.78,
  },
  {
    vibe: "Noir",
    bg: "#1a1a18",
    accent: "#c9a84c",
    label: "@maxstudio",
    top: "60%",
    right: "4%",
    rotate: 6,
    scale: 0.84,
  },
];

function KitCardFloat({ card, index }: { card: KitCard; index: number }): ReactNode {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: card.rotate * 0.3 }}
      animate={{ opacity: 1, y: 0, rotate: card.rotate }}
      transition={{
        opacity: { duration: 0.8, ease: softEase, delay: 0.6 + index * 0.12 },
        y: { duration: 0.9, ease: softEase, delay: 0.6 + index * 0.12 },
        rotate: { duration: 0.9, ease: softEase, delay: 0.6 + index * 0.12 },
      }}
      style={{
        position: "absolute",
        top: card.top,
        left: card.left,
        right: card.right,
        transform: `scale(${card.scale})`,
        transformOrigin: "center",
      }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 4 + index * 0.7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.5,
        }}
        style={{ backgroundColor: card.bg }}
        className="w-36 rounded-2xl p-4 shadow-2xl sm:w-44"
      >
        <div
          className="mb-3 h-10 w-10 rounded-full"
          style={{ backgroundColor: card.accent, opacity: 0.9 }}
        />
        <div className="space-y-1.5">
          <div
            className="h-2 w-20 rounded-full opacity-70"
            style={{ backgroundColor: card.accent }}
          />
          <div
            className="h-1.5 w-14 rounded-full opacity-40"
            style={{ backgroundColor: card.accent }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span
            className="text-[10px] font-medium opacity-60"
            style={{ color: card.accent }}
          >
            {card.label}
          </span>
          <span
            className="rounded-sm px-1.5 py-0.5 text-[9px] font-semibold tracking-wide"
            style={{ backgroundColor: card.accent, color: card.bg }}
          >
            {card.vibe}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Hero(): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const scrollFade = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-svh items-center justify-center overflow-hidden"
    >
      {/* Floating kit cards — desktop only */}
      {!prefersReducedMotion && (
        <motion.div
          style={{ opacity: scrollFade }}
          className="pointer-events-none absolute inset-0 hidden lg:block"
          aria-hidden
        >
          {KIT_CARDS.map((card, i) => (
            <KitCardFloat key={card.vibe} card={card} index={i} />
          ))}
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        style={{ y: prefersReducedMotion ? 0 : scrollY, opacity: scrollFade }}
        className="relative z-10 flex max-w-3xl flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-20"
      >
        {/* Referral program announcement — the program is the main acquisition loop, so it
            gets the first thing on the page. Numbers come from lib/referral-terms. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: softEase, delay: 0 }}
          className="mb-7"
        >
          <Link
            href="/referral-program"
            className="focus-ring group border-border bg-background/70 hover:border-foreground/30 inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs font-medium backdrop-blur transition-colors"
          >
            <span className="bg-foreground text-background rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
              New
            </span>
            <span className="text-foreground">
              Earn {REFERRAL_RATE_PCT}% for every creator you refer
            </span>
            <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden>
              →
            </span>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: softEase, delay: 0.05 }}
          className="text-muted-foreground mb-6 text-xs font-semibold tracking-[0.2em] uppercase"
        >
          {/*
            Names the product and states what it is, above the fold. The headline below is
            benefit-led and never says "Kitevo", so without this a first-time visitor reads
            a promise before they know what they are looking at. Google's OAuth branding
            review flagged exactly that: homepage does not explain the purpose, and the
            consent-screen app name does not match anything prominent on the page.
          */}
          Kitevo · Live Media Kits for Creators
        </motion.p>

        <h1 className="text-foreground text-[clamp(32px,7vw,80px)] leading-[1.04] font-medium tracking-tight text-balance">
          {prefersReducedMotion ? (
            HEADLINE
          ) : (
            <>
              <span className="sr-only">{HEADLINE}</span>
              <motion.span
                aria-hidden
                initial="hidden"
                animate="visible"
                variants={WORD_CONTAINER}
                className="flex flex-wrap justify-center gap-x-[0.25em]"
              >
                {WORDS.map((word, i) => (
                  <span
                    key={`${word}-${i}`}
                    className="-mb-[0.1em] inline-flex overflow-hidden pb-[0.1em]"
                  >
                    <motion.span variants={WORD_ITEM} className="inline-block">
                      {word}
                    </motion.span>
                  </span>
                ))}
              </motion.span>
            </>
          )}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: softEase, delay: 0.55 }}
          className="text-muted-foreground mt-7 max-w-md text-base leading-relaxed"
        >
          Stop sending ugly PDFs. Kitevo turns your Instagram presence
          into a live, high-end portfolio with real engagement data, audience
          demographics, and growth charts brands actually want to see.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: softEase, delay: 0.7 }}
          className="mt-10 flex w-full flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:w-auto"
        >
          <Link
            href="/signup"
            className="focus-ring bg-foreground text-background inline-flex h-13 w-full items-center justify-center rounded-full px-8 text-sm font-medium transition-opacity hover:opacity-80 sm:w-auto"
          >
            Start building for free
          </Link>
          {/*
            Points at a real kit rather than scrolling to #how-it-works. Nothing on the
            public site linked to the demo, so a visitor could not see what Kitevo
            produces without signing up first — and the product is the page, not the
            description of it. #how-it-works is still reachable from the nav.
          */}
          <Link
            href="/kit/demo"
            className="focus-ring border-border text-foreground hover:bg-muted inline-flex h-13 w-full items-center justify-center rounded-full border px-8 text-sm font-medium transition-colors sm:w-auto"
          >
            See a live media kit
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: softEase, delay: 0.9 }}
          className="text-muted-foreground mt-6 text-xs"
        >
          Free plan available · No credit card required
        </motion.p>

        {/* The floating cards are lg-only, which left the hero empty on phones. Show a compact
            fan of the same vibes here so mobile still sees what Kitevo actually makes. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: softEase, delay: 1 }}
          className="mt-12 flex items-center justify-center lg:hidden"
          aria-hidden
        >
          {KIT_CARDS.slice(0, 3).map((card, i) => (
            <div
              key={card.vibe}
              style={{
                backgroundColor: card.bg,
                transform: `rotate(${card.rotate * 0.8}deg)`,
                marginLeft: i === 0 ? 0 : -18,
                zIndex: i,
              }}
              className="w-28 shrink-0 rounded-2xl p-3 shadow-xl sm:w-32"
            >
              <div className="mb-2.5 h-7 w-7 rounded-full" style={{ backgroundColor: card.accent, opacity: 0.9 }} />
              <div className="space-y-1">
                <div className="h-1.5 w-14 rounded-full opacity-70" style={{ backgroundColor: card.accent }} />
                <div className="h-1 w-9 rounded-full opacity-40" style={{ backgroundColor: card.accent }} />
              </div>
              <div className="mt-2.5">
                <span
                  className="rounded-sm px-1.5 py-0.5 text-[9px] font-semibold tracking-wide"
                  style={{ backgroundColor: card.accent, color: card.bg }}
                >
                  {card.vibe}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
