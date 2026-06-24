"use client";

import { SectionHeading } from "@/components/section-heading";
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
  highlight?: boolean;
  cta: string;
  ctaHref: string;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started and share your first kit.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    kits: "1 media kit",
    features: [
      "1 media kit",
      "Shareable link",
      "Basic profile & bio",
      "Manual stats entry",
      "Work samples & rates",
    ],
    cta: "Start for free",
    ctaHref: "/signup",
  },
  {
    id: "starter",
    name: "Starter",
    description: "Live data and a professional kit that stands out.",
    monthlyPrice: 9,
    yearlyPrice: 7,
    kits: "1 media kit",
    features: [
      "Everything in Free",
      "Instagram live stats",
      "Audience demographics",
      "Growth charts",
      "Section visibility controls",
      "Priority support",
    ],
    cta: "Get Starter",
    ctaHref: "/pricing",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Full brand identity control and multiple kits for serious creators.",
    monthlyPrice: 15,
    yearlyPrice: 12,
    kits: "Up to 3 media kits",
    features: [
      "Everything in Starter",
      "3 media kits",
      "Brand Kit Vibes (5 styles)",
      "Custom color palette",
      "Font pair selector",
      "Logo upload",
      "Custom CTA & inquiry form",
    ],
    highlight: true,
    cta: "Get Pro",
    ctaHref: "/pricing",
  },
];

export function PricingSection(): ReactNode {
  const [yearly, setYearly] = useState(false);

  return (
    <section
      id="pricing"
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10"
    >
      <div className="flex flex-col items-center">
        <SectionHeading
          label="Pricing"
          title="Start free. Upgrade when brands start saying yes."
          align="center"
        />

        {/* Billing toggle */}
        <InView className="mt-8">
          <div className="border-border inline-flex rounded-full border p-1">
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
                "focus-ring rounded-full px-5 py-2 text-sm font-medium transition-colors",
                yearly ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className="ml-1.5 text-[10px] font-semibold text-green-600">-20%</span>
            </button>
          </div>
        </InView>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {PLANS.map((plan, i) => (
          <InView
            key={plan.id}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
          >
            <div
              className={cn(
                "relative flex h-full flex-col rounded-3xl border p-8",
                plan.highlight
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background border-border"
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-0.5 text-xs font-semibold text-background ring-2 ring-background">
                  Most popular
                </span>
              )}

              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    plan.highlight ? "text-background/60" : "text-muted-foreground"
                  )}
                >
                  {plan.name}
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-[clamp(36px,4vw,48px)] font-medium tracking-tight leading-none">
                    {plan.monthlyPrice === 0
                      ? "Free"
                      : `$${yearly ? plan.yearlyPrice : plan.monthlyPrice}`}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span
                      className={cn(
                        "text-sm",
                        plan.highlight ? "text-background/60" : "text-muted-foreground"
                      )}
                    >
                      /mo{yearly && " billed yearly"}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-3 text-sm leading-relaxed",
                    plan.highlight ? "text-background/70" : "text-muted-foreground"
                  )}
                >
                  {plan.description}
                </p>
              </div>

              <div
                className={cn(
                  "my-6 h-px",
                  plan.highlight ? "bg-background/15" : "bg-border"
                )}
              />

              <ul className="flex flex-1 flex-col gap-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 text-base leading-none",
                        plan.highlight ? "text-background/70" : "text-muted-foreground"
                      )}
                    >
                      ✓
                    </span>
                    <span className={plan.highlight ? "text-background/90" : ""}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
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
    </section>
  );
}
