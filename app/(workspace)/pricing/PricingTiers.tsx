"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SubscriptionTier } from "@/config/subscriptions";
import type { BillingInterval } from "@/config/subscriptions";

/**
 * Per-month figure to show when billed yearly, derived from the tier's annual price.
 * Matches BrandPlanCard.yearlyPerMonth so both surfaces round the same way.
 *
 * Deliberately NOT a hardcoded {starter: 7, pro: 12} map, which is what let the page
 * advertise a yearly price for a tier that had no yearly product configured — clicking it
 * 500'd at checkout. Now the display and the checkout both come from config: a tier
 * without `priceYearly` shows no yearly option at all.
 */
function yearlyPerMonth(priceYearly: number): number {
  return Math.round(priceYearly / 12);
}

/** True only for tiers that actually have an annual plan, so the toggle can't oversell. */
function hasYearly(tier: SubscriptionTier): boolean {
  return typeof tier.priceYearly === "number" && tier.priceYearly > 0;
}

/** What GET /api/me/trial says about the Pro free trial. */
type TrialInfo = { eligible: boolean; signedIn: boolean; days: number };

function SubscribeButton({
  tier,
  isHighlighted,
  billing,
  trial,
  code,
}: {
  tier: SubscriptionTier;
  isHighlighted?: boolean;
  billing: BillingInterval;
  /** Set only when this tier offers a trial to this visitor. */
  trial?: TrialInfo | null;
  code?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Never request a yearly checkout for a tier with no yearly price, even if the toggle is
  // on: getPriceIdForTier would return null and the route would 500. Defence in depth —
  // the card already hides the yearly option for these tiers.
  const effectiveBilling: BillingInterval = hasYearly(tier) ? billing : "monthly";

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tier.id, billing: effectiveBilling, trial: !!trial?.eligible, code }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.status === 401) {
        const callbackUrl = encodeURIComponent(`/pricing?billing=${effectiveBilling}${code ? `&code=${encodeURIComponent(code)}` : ""}`);
        window.location.href = `/login?callbackUrl=${callbackUrl}`;
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to create checkout");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading}
        className={`w-full px-6 py-3 font-medium rounded-full transition-opacity disabled:opacity-70 disabled:cursor-not-allowed ${
          isHighlighted
            ? "bg-primary text-primary-foreground hover:opacity-80"
            : "border border-border text-foreground hover:bg-muted"
        }`}
      >
        {loading ? "Redirecting…" : trial?.eligible ? `Start ${trial.days}-day free trial` : `Continue with ${tier.name}`}
      </button>
      {trial?.eligible && (
        <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
          Free for {trial.days} days, then ${effectiveBilling === "yearly" && tier.priceYearly ? `${tier.priceYearly}/yr` : `${tier.priceMonthly}/mo`}. Cancel before it ends and
          you won&apos;t be charged.
        </p>
      )}
      {trial && !trial.signedIn && trial.days > 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">Includes a {trial.days}-day free trial for new subscribers.</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function PricingTiers({
  tiers,
  highlightTierId,
  defaultBilling = "monthly",
  code,
}: {
  tiers: SubscriptionTier[];
  highlightTierId?: string;
  defaultBilling?: BillingInterval;
  /** Discount code from a ?code= link, pre-applied at checkout. */
  code?: string;
}) {
  const [billing, setBilling] = useState<BillingInterval>(defaultBilling);
  const [trial, setTrial] = useState<TrialInfo | null>(null);

  // Whether to offer the Pro free trial (the checkout route re-checks; this only labels buttons).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/trial", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && d && setTrial({ eligible: d.eligible === true, signedIn: d.signedIn === true, days: Number(d.days) || 0 }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-12 max-w-4xl mx-auto">
      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center border border-border rounded-full p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              billing === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              billing === "yearly" ? "bg-white/20 text-white" : "bg-green-100 text-green-700"
            }`}>
              −20%
            </span>
          </button>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const isHighlighted = highlightTierId ? tier.id === highlightTierId : tier.highlight;
          // Yearly display only when the tier has a real annual plan; otherwise the
          // monthly price stands even under the yearly toggle, so nothing is oversold.
          const showYearly = billing === "yearly" && hasYearly(tier);
          const displayPrice = showYearly
            ? yearlyPerMonth(tier.priceYearly!)
            : tier.priceMonthly;

          return (
            <div
              key={tier.id}
              className={`relative p-8 rounded-2xl border bg-background text-left transition-shadow ${
                isHighlighted ? "border-primary ring-2 ring-primary shadow-lg shadow-primary/10" : "border-border"
              }`}
            >
              {isHighlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  {highlightTierId ? "Selected plan" : "Most popular"}
                </span>
              )}
              <h2 className="font-display text-xl font-semibold text-foreground">{tier.name}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                {tier.priceMonthly === 0 ? (
                  <span className="font-display text-3xl font-semibold text-foreground">Free</span>
                ) : (
                  <>
                    <span className="font-display text-3xl font-semibold text-foreground">${displayPrice}</span>
                    <span className="text-muted-foreground text-sm">
                      /mo{showYearly ? ", billed yearly" : ""}
                    </span>
                  </>
                )}
              </div>
              {showYearly && (
                <p className="mt-0.5 text-xs text-emerald-600 font-medium">
                  Save ${(tier.priceMonthly - displayPrice) * 12}/yr vs monthly
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{tier.kitsAllowed} media kit{tier.kitsAllowed !== 1 ? "s" : ""}</p>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-foreground">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {tier.priceMonthly === 0 ? (
                  <Link href="/signup" className="block w-full px-6 py-3 text-center font-medium rounded-full border border-border text-foreground hover:bg-muted transition-colors text-sm">
                    Start for free
                  </Link>
                ) : (
                  <SubscribeButton tier={tier} isHighlighted={!!isHighlighted} billing={billing} trial={tier.id === "pro" ? trial : null} code={code} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {code ? (
          <>
            Code <span className="rounded bg-primary-soft px-1.5 py-0.5 font-mono text-primary-soft-foreground">{code}</span> will be applied at checkout.
          </>
        ) : (
          "Have a discount code? You can enter it at checkout."
        )}
      </p>
    </div>
  );
}
