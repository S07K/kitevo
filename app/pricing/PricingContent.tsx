"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPublicTiers } from "@/config/subscriptions";
import { PricingTiers } from "./PricingTiers";

export function PricingContent() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasSubscription: boolean;
    tierName?: string | null;
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
      <p className="mt-12 text-[#5C5C5C]">Loading…</p>
    );
  }

  if (subscriptionStatus.hasSubscription) {
    return (
      <div className="mt-12 max-w-md mx-auto p-8 rounded-lg border border-[#E8E6E3] bg-white text-center">
        <p className="font-display text-lg font-semibold text-[#1A1A1A]">
          You&apos;re already subscribed
        </p>
        {subscriptionStatus.tierName && (
          <p className="mt-2 text-sm text-[#5C5C5C]">
            Current plan: <span className="font-medium text-[#1A1A1A]">{subscriptionStatus.tierName}</span>
          </p>
        )}
        <p className="mt-4 text-sm text-[#5C5C5C]">
          Manage your plan, payment method, or cancel from your dashboard.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex justify-center px-6 py-3 bg-[#1A1A1A] text-white font-medium rounded-sm hover:bg-[#2D2D2D]"
          >
            Go to Dashboard
          </Link>
          <ManageSubscriptionButton />
        </div>
      </div>
    );
  }

  const tiers = getPublicTiers();
  return <PricingTiers tiers={tiers} />;
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
      className="inline-flex justify-center px-6 py-3 border border-[#1A1A1A] text-[#1A1A1A] font-medium rounded-sm hover:bg-[#FAFAFA] disabled:opacity-70"
    >
      {loading ? "Opening…" : "Manage subscription"}
    </button>
  );
}
