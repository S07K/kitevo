"use client";

import { InView } from "@/lib/motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type Plan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  kits: string;
  features: string[];
  proOnly: boolean[];
  highlight?: boolean;
  cta: string;
  ctaHref: string;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get a shareable kit link today.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    kits: "1 kit",
    features: [
      "1 media kit",
      "Shareable link",
      "Basic profile & bio",
      "Manual stats entry",
      "Brand partners & appearance styles",
    ],
    proOnly: [false, false, false, false, false],
    cta: "Start for free",
    ctaHref: "/signup",
  },
  {
    id: "starter",
    name: "Starter",
    description: "Live Instagram data. Brands see what's real.",
    monthlyPrice: 9,
    yearlyPrice: 7,
    kits: "1 kit",
    features: [
      "Everything in Free",
      "Live Instagram stats",
      "Audience demographics",
      "Growth charts",
      "Section visibility controls",
    ],
    proOnly: [false, false, false, false, false],
    cta: "Get Starter",
    ctaHref: "/pricing?plan=starter",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Full brand identity. Built to close deals.",
    monthlyPrice: 15,
    yearlyPrice: 12,
    kits: "Up to 3 kits",
    features: [
      "Everything in Starter",
      "3 media kits",
      "Brand Kit Vibes (5 styles)",
      "Brand inquiry inbox",
      "Inquiry pipeline & deal statuses",
    ],
    proOnly: [false, false, true, true, true],
    highlight: true,
    cta: "Get Pro",
    ctaHref: "/pricing?plan=pro",
  },
];

const CHECK = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function PricingSection(): ReactNode {
  const [yearly, setYearly] = useState(false);

  return (
    <section
      id="pricing"
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10"
    >
      {/* Header row */}
      <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <InView className="max-w-xl">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.18em] uppercase">
            Pricing
          </p>
          <h2 className="text-foreground text-[clamp(28px,4vw,48px)] font-medium leading-[1.08] tracking-tight text-balance">
            Start free. Upgrade when<br className="hidden sm:block" /> brands start saying yes.
          </h2>
        </InView>

        {/* Billing toggle */}
        <InView>
          <div className="border-border inline-flex items-center rounded-full border p-1">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={cn(
                "focus-ring rounded-full px-5 py-2 text-sm font-medium transition-colors",
                !yearly ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={cn(
                "focus-ring flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-colors",
                yearly ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                yearly ? "bg-background/20 text-background" : "bg-green-100 text-green-700"
              )}>
                −20%
              </span>
            </button>
          </div>
        </InView>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan, i) => (
          <InView
            key={plan.id}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
          >
            <div
              className={cn(
                "relative flex h-full flex-col rounded-3xl p-7",
                plan.highlight
                  ? "bg-foreground text-background"
                  : "bg-background border-border border"
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                  <span className="bg-background text-foreground ring-background rounded-full px-4 py-1 text-xs font-semibold ring-2">
                    Most popular
                  </span>
                </div>
              )}

              {/* Plan name + kit count */}
              <div className="flex items-start justify-between gap-4">
                <p className={cn(
                  "text-sm font-semibold tracking-wide uppercase",
                  plan.highlight ? "text-background/50" : "text-muted-foreground"
                )}>
                  {plan.name}
                </p>
                <span className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                  plan.highlight ? "bg-background/15 text-background/70" : "bg-muted text-muted-foreground"
                )}>
                  {plan.kits}
                </span>
              </div>

              {/* Price */}
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-[44px] font-medium leading-none tracking-tight">
                  {plan.monthlyPrice === 0 ? "Free" : `$${yearly ? plan.yearlyPrice : plan.monthlyPrice}`}
                </span>
                {plan.monthlyPrice > 0 && (
                  <span className={cn("text-sm", plan.highlight ? "text-background/50" : "text-muted-foreground")}>
                    /mo{yearly ? ", billed yearly" : ""}
                  </span>
                )}
              </div>
              <p className={cn("mt-2 text-sm leading-relaxed", plan.highlight ? "text-background/65" : "text-muted-foreground")}>
                {plan.description}
              </p>

              {/* Divider */}
              <div className={cn("my-6 h-px", plan.highlight ? "bg-background/15" : "bg-border")} />

              {/* Features */}
              <ul className="flex flex-1 flex-col gap-3">
                {plan.features.map((f, fi) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      plan.highlight
                        ? "bg-background/15 text-background"
                        : plan.proOnly[fi]
                          ? "bg-foreground/10 text-foreground"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {CHECK}
                    </span>
                    <span className={cn(
                      "text-sm",
                      plan.highlight ? "text-background/85" : "",
                      !plan.highlight && plan.proOnly[fi] ? "text-foreground font-medium" : ""
                    )}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={
                  plan.monthlyPrice === 0
                    ? plan.ctaHref
                    : `${plan.ctaHref}${yearly ? "&billing=yearly" : ""}`
                }
                className={cn(
                  "focus-ring mt-8 inline-flex h-12 items-center justify-center rounded-full text-sm font-medium transition-opacity hover:opacity-80",
                  plan.highlight
                    ? "bg-background text-foreground"
                    : "bg-foreground text-background"
                )}
              >
                {plan.cta}
              </Link>
            </div>
          </InView>
        ))}
      </div>

      {/* Bottom note */}
      <InView className="mt-8 text-center">
        <p className="text-muted-foreground text-sm">
          All plans include a shareable kit URL, no credit card required for Free.{" "}
          <Link href="/pricing" className="text-foreground underline underline-offset-4 hover:no-underline">
            See full comparison
          </Link>
        </p>
      </InView>
    </section>
  );
}
