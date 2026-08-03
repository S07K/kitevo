"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPublicTiers } from "@/config/subscriptions";
import { PricingTiers } from "./PricingTiers";

export function PricingContent() {
  const searchParams = useSearchParams();
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasSubscription: boolean;
    tierName?: string | null;
    tierId?: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/subscription-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled && data) {
          setSubscriptionStatus({
            hasSubscription: data.hasSubscription === true,
            tierName: data.tierName ?? null,
            tierId: data.tierId ?? null,
          });
        } else if (!cancelled) {
          setSubscriptionStatus({ hasSubscription: false });
        }
      })
      .catch(() => {
        if (!cancelled) setSubscriptionStatus({ hasSubscription: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (subscriptionStatus === null) {
    return (
      <p className="mt-12 text-muted-foreground">Loading…</p>
    );
  }

  // Comped access: a tier with no subscription. Distinct from a paying subscriber because
  // there is nothing to manage — no customer, so no billing portal button (it would fail).
  const isComped =
    !subscriptionStatus.hasSubscription &&
    !!subscriptionStatus.tierId &&
    subscriptionStatus.tierId !== "free";

  if (subscriptionStatus.hasSubscription || isComped) {
    return (
      <div className="mt-12 max-w-md mx-auto p-8 rounded-2xl border border-border bg-background text-center">
        <p className="font-display text-lg font-semibold text-foreground">
          {isComped ? "You have full access" : "You're already subscribed"}
        </p>
        {subscriptionStatus.tierName && (
          <p className="mt-2 text-sm text-muted-foreground">
            Current plan: <span className="font-medium text-foreground">{subscriptionStatus.tierName}</span>
            {isComped ? " (complimentary)" : ""}
          </p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          {isComped
            ? "Everything is unlocked. Head to your dashboard to build your kit."
            : "Manage your plan, payment method, or cancel from your dashboard."}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex justify-center px-6 py-3 bg-foreground text-background font-medium rounded-full hover:opacity-80 transition-opacity"
          >
            Go to Dashboard
          </Link>
          {/* No billing portal for a comp: there is no customer to manage. */}
          {!isComped && <ManageSubscriptionButton />}
        </div>
      </div>
    );
  }

  const tiers = getPublicTiers();
  const billing = searchParams.get("billing") === "yearly" ? "yearly" : "monthly";
  return (
    <PricingTiers
      tiers={tiers}
      highlightTierId={searchParams.get("plan") ?? undefined}
      defaultBilling={billing}
    />
  );
}

function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleManage}
      disabled={loading}
      className="inline-flex justify-center px-6 py-3 border border-border text-foreground font-medium rounded-full hover:bg-muted transition-colors disabled:opacity-70"
    >
      {loading ? "Opening…" : "Manage subscription"}
    </button>
  );
}
