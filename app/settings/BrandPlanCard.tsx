"use client";

import { useState, useEffect, useCallback } from "react";
import { getPublicTiers } from "@/config/subscriptions";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";

const BRAND_TIER = getPublicTiers("brand")[0];

type Billing = "monthly" | "yearly";

type Status = {
  loading: boolean;
  isPro: boolean;
};

/** Effective per-month price when billed yearly (shown as a small monthly figure). */
function yearlyPerMonth(priceYearly: number): number {
  return Math.round(priceYearly / 12);
}

export function BrandPlanCard() {
  const [status, setStatus] = useState<Status>({ loading: true, isPro: false });
  const [billing, setBilling] = useState<Billing>("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUpgraded, setJustUpgraded] = useState(false);

  const refreshStatus = useCallback(async (sessionId?: string) => {
    try {
      const res = await fetch("/api/subscription-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
      });
      const d = await res.json().catch(() => ({}));
      setStatus({ loading: false, isPro: d?.verifiedTier === "brand_verified" });
    } catch {
      setStatus({ loading: false, isPro: false });
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const success = params.get("success") === "true";
    if (success) setJustUpgraded(true);
    if (params.get("canceled") === "true") setError("Checkout canceled — no charge was made.");

    // Finalize the checkout (links customer + syncs tier) when returning from Stripe.
    refreshStatus(sessionId ?? undefined);

    // Clean the query string so a refresh doesn't re-trigger.
    if (success || sessionId || params.get("canceled")) {
      const url = window.location.pathname;
      window.history.replaceState({}, "", url);
    }
  }, [refreshStatus]);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tierId: "brand", billing, returnTo: "brand" }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent("/settings")}`;
        return;
      }
      if (res.status === 409) {
        // Already subscribed — refresh to reflect Pro state.
        await refreshStatus();
        return;
      }
      if (!res.ok) throw new Error(d.error || "Could not start checkout.");
      if (d.url) window.location.href = d.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ returnTo: "brand" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Could not open billing portal.");
      if (d.url) window.location.href = d.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (status.loading) {
    return <div className="h-40 rounded-2xl border border-border bg-muted/40 animate-pulse" />;
  }

  // ── Active Brand Pro ──
  if (status.isPro) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <VerifiedBadge tier="brand_verified" size="md" />
            <div>
              <p className="text-sm font-semibold text-foreground">Brand Pro</p>
              <p className="text-xs text-muted-foreground">Your brand is verified — thanks for supporting Kitevo.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openPortal}
            disabled={busy}
            className="h-9 px-4 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
          >
            {busy ? "Opening…" : "Manage billing"}
          </button>
        </div>
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // ── Upgrade CTA ──
  const monthly = BRAND_TIER.priceMonthly;
  const perMonth = billing === "yearly" && BRAND_TIER.priceYearly
    ? yearlyPerMonth(BRAND_TIER.priceYearly)
    : monthly;
  const yearlySavings = BRAND_TIER.priceYearly ? monthly * 12 - BRAND_TIER.priceYearly : 0;

  return (
    <div className="rounded-2xl border border-foreground/60 bg-muted/20 p-6">
      {justUpgraded && (
        <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2.5">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">Payment received — your Brand Pro badge will appear in a moment.</p>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <VerifiedBadge tier="brand_verified" size="md" />
          <div>
            <p className="text-base font-semibold text-foreground">Upgrade to Brand Pro</p>
            <p className="text-xs text-muted-foreground mt-0.5">Stand out to creators and run more campaigns.</p>
          </div>
        </div>

        {/* Monthly / yearly toggle */}
        <div className="flex items-center rounded-full border border-border p-0.5 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${billing === "monthly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${billing === "yearly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Price */}
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold text-foreground tabular-nums">${perMonth}</span>
        <span className="text-sm text-muted-foreground">/mo{billing === "yearly" ? ", billed yearly" : ""}</span>
      </div>
      {billing === "yearly" && yearlySavings > 0 && (
        <p className="mt-0.5 text-xs text-emerald-600 font-medium">Save ${yearlySavings}/yr vs monthly</p>
      )}

      {/* Features */}
      <ul className="mt-4 space-y-2">
        {BRAND_TIER.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground shrink-0" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={startCheckout}
        disabled={busy}
        className="mt-5 h-10 px-6 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        {busy ? "Redirecting…" : "Upgrade to Brand Pro"}
      </button>
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </div>
  );
}
