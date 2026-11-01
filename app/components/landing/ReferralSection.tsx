"use client";

import { softEase, useReducedMotion } from "@/lib/motion";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PayPalMark, WiseMark, BankMark } from "@/app/components/PayoutLogos";
import { REFERRAL_RATE_PCT, REFERRAL_TERMS, exampleEarnings } from "@/lib/referral-terms";

/**
 * Landing-page pitch for the referral program. The right-hand panel is an illustrative
 * mock of the earnings card (labelled "Example") built from the real terms and plan
 * prices — never fabricated people or results.
 */
export function ReferralSection(): ReactNode {
  const reduce = useReducedMotion();
  const pro = exampleEarnings("pro");
  const starter = exampleEarnings("starter");
  const rows = [
    { plan: pro.tierName, amount: pro.perMonth },
    { plan: starter.tierName, amount: starter.perMonth },
    { plan: pro.tierName, amount: pro.perMonth },
  ];
  const monthTotal = rows.reduce((s, r) => s + r.amount, 0);
  const usd = (n: number) => `$${n.toFixed(2)}`;

  return (
    <section id="earn" className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10">
      <div
        style={{ backgroundColor: "var(--surface)", color: "var(--surface-foreground)" }}
        className="grid items-center gap-12 overflow-hidden rounded-[40px] px-6 py-16 sm:px-12 sm:py-20 lg:grid-cols-2 lg:gap-16"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-50">Referral program</p>
          <h2 className="mt-5 text-[clamp(32px,4.5vw,56px)] font-medium leading-[1.05] tracking-tight text-balance">
            Share Kitevo. Earn {REFERRAL_RATE_PCT}% for {REFERRAL_TERMS.months} months.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed opacity-60">
            Every creator you invite who upgrades earns you {REFERRAL_RATE_PCT}% of what they pay, every month for a year. Your media
            kit already carries your link, so every brand or creator who opens it can become your referral.
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            {[
              "Free to join, on any plan",
              `Up to $${pro.perReferral.toFixed(0)} per creator on ${pro.tierName}`,
              `Paid monthly once you pass $${REFERRAL_TERMS.minPayout.USD / 100}`,
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--surface-foreground)", color: "var(--surface)" }}
                  aria-hidden
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="opacity-80">{t}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              style={{ backgroundColor: "var(--surface-foreground)", color: "var(--surface)" }}
              className="focus-ring inline-flex h-13 items-center justify-center rounded-full px-8 text-sm font-medium transition-opacity hover:opacity-80"
            >
              Get your invite link
            </Link>
            <Link
              href="/referral-program"
              className="focus-ring inline-flex h-13 items-center justify-center rounded-full border border-current/20 px-8 text-sm font-medium transition-opacity hover:opacity-70"
            >
              How it works
            </Link>
          </div>
        </div>

        {/* Illustrative earnings card */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: softEase }}
          className="relative mx-auto w-full max-w-md"
          aria-hidden
        >
          <div className="rounded-[28px] bg-background p-6 text-foreground shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Referral earnings</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Example</span>
            </div>
            <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">{usd(monthTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">this month, from 3 referred creators</p>

            <ul className="mt-6 divide-y divide-border border-y border-border">
              {rows.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-3 text-sm">
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>
                      Creator on <span className="font-medium">{r.plan}</span>
                    </span>
                  </span>
                  <span className="font-medium tabular-nums text-green-600 dark:text-green-400">+{usd(r.amount)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-muted/50 p-3">
              <span className="flex items-center gap-2.5">
                <PayPalMark size={32} />
                <span className="text-xs">
                  <span className="block font-medium">Monthly payout</span>
                  <span className="text-muted-foreground">PayPal, Wise or bank</span>
                </span>
              </span>
              <span className="flex -space-x-1.5">
                <WiseMark size={24} className="ring-2 ring-background" />
                <BankMark size={24} className="ring-2 ring-background" />
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
