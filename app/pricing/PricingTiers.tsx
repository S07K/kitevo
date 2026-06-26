"use client";

import { useState } from "react";
import type { SubscriptionTier } from "@/config/subscriptions";

function SubscribeButton({ tier }: { tier: SubscriptionTier }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tier.id }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.status === 401) {
        const callbackUrl = encodeURIComponent("/pricing");
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
          tier.highlight
            ? "bg-foreground text-background hover:opacity-80"
            : "border border-border text-foreground hover:bg-muted"
        }`}
      >
        {loading ? "Redirecting…" : `Continue with ${tier.name}`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function PricingTiers({ tiers }: { tiers: SubscriptionTier[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-3xl mx-auto">
      {tiers.map((tier) => (
        <div
          key={tier.id}
          className={`relative p-8 rounded-2xl border bg-background text-left ${
            tier.highlight ? "border-foreground ring-1 ring-foreground" : "border-border"
          }`}
        >
          {tier.highlight && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-foreground text-background text-xs font-medium rounded-full">
              Most popular
            </span>
          )}
          <h2 className="font-display text-xl font-semibold text-foreground">{tier.name}</h2>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display text-3xl font-semibold text-foreground">
              ${tier.priceMonthly}
            </span>
            <span className="text-muted-foreground">/month</span>
          </div>
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
            <SubscribeButton tier={tier} />
          </div>
        </div>
      ))}
    </div>
  );
}
