"use client";

import { useState } from "react";
import { REFERRAL_RATE_PCT, REFERRAL_TERMS } from "@/lib/referral-terms";

type Plan = { id: string; name: string; monthlyPrice: number };

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
}

/** "Refer N creators on plan X → you earn Y." Uses real plan prices and REFERRAL_TERMS. */
export function EarningsEstimator({ plans }: { plans: Plan[] }) {
  const [count, setCount] = useState(10);
  const [planId, setPlanId] = useState(plans.find((p) => p.id === "pro")?.id ?? plans[0]?.id);
  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const perMonth = ((plan?.monthlyPrice ?? 0) * REFERRAL_TERMS.rateBps) / 10000;
  const monthly = perMonth * count;
  const total = monthly * REFERRAL_TERMS.months;

  return (
    <div className="rounded-[28px] border border-border bg-background p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Estimate your earnings</p>
        <div className="inline-flex rounded-full bg-muted p-1" role="radiogroup" aria-label="Plan your referrals are on">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={p.id === planId}
              onClick={() => setPlanId(p.id)}
              className={`h-8 rounded-full px-4 text-xs font-medium transition-colors ${
                p.id === planId ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.name} · {usd(p.monthlyPrice)}/mo
            </button>
          ))}
        </div>
      </div>

      <label className="mt-8 block">
        <span className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Creators you refer</span>
          <span className="text-2xl font-semibold tabular-nums text-foreground">{count}</span>
        </span>
        <input
          type="range"
          min={1}
          max={100}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="mt-3 w-full accent-foreground"
          aria-label="Number of creators you refer"
        />
      </label>

      <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6">
        <div>
          <p className="text-xs text-muted-foreground">Every month</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{usd(monthly)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Over {REFERRAL_TERMS.months} months</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{usd(total)}</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {REFERRAL_RATE_PCT}% of {usd(plan?.monthlyPrice ?? 0)}/mo = {usd(perMonth)} per creator per month, if they stay subscribed for{" "}
        {REFERRAL_TERMS.months} months. Monthly list price before tax; actual earnings depend on what your referrals pay.
      </p>
    </div>
  );
}
