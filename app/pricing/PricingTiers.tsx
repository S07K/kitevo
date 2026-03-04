"use client";

import { useState } from "react";
import type { SubscriptionTier } from "@/config/subscriptions";

function SubscribeButton({ tier, email }: { tier: SubscriptionTier; email?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    const userEmail = email || (typeof window !== "undefined" ? prompt("Enter your email to subscribe:") : null);
    if (!userEmail) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, tierId: tier.id }),
      });
      const data = await res.json();
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
        className={`w-full px-6 py-3 font-medium rounded-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${
          tier.highlight
            ? "bg-[#1A1A1A] text-white hover:bg-[#2D2D2D]"
            : "border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#FAFAFA]"
        }`}
      >
        {loading ? "Redirecting…" : `Continue with ${tier.name}`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function PricingTiers({
  tiers,
  email,
}: {
  tiers: SubscriptionTier[];
  email?: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-3xl mx-auto">
      {tiers.map((tier) => (
        <div
          key={tier.id}
          className={`relative p-8 rounded-lg border bg-white text-left ${
            tier.highlight ? "border-[#1A1A1A] ring-1 ring-[#1A1A1A]" : "border-[#E8E6E3]"
          }`}
        >
          {tier.highlight && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#1A1A1A] text-white text-xs font-medium rounded-full">
              Most popular
            </span>
          )}
          <h2 className="font-display text-xl font-semibold text-[#1A1A1A]">{tier.name}</h2>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display text-3xl font-semibold text-[#1A1A1A]">
              ${tier.priceMonthly}
            </span>
            <span className="text-[#5C5C5C]">/month</span>
          </div>
          <p className="mt-1 text-xs text-[#8C8C8C]">{tier.kitsAllowed} media kit{tier.kitsAllowed !== 1 ? "s" : ""}</p>
          <ul className="mt-6 space-y-3 text-sm text-[#5C5C5C]">
            {tier.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-[#1A1A1A]">✓</span>
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <SubscribeButton tier={tier} email={email} />
          </div>
        </div>
      ))}
    </div>
  );
}
