"use client";

import { useState, useEffect, useCallback } from "react";
import { getPublicTiers } from "@/config/subscriptions";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { Skeleton } from "@/app/components/Skeleton";
import { Check } from "lucide-react";
import { Panel } from "@/app/components/workspace/WorkspaceShell";
import { Button } from "@/app/components/workspace/Button";

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
    return (
      <Panel title="Plan">
        <div aria-hidden>
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="mt-2 h-3 w-4/5 rounded-full" />
          <Skeleton className="mt-5 h-9 w-full rounded-full" />
        </div>
      </Panel>
    );
  }

  const errorLine = error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>;

  // ── Active Brand Pro ──
  if (status.isPro) {
    return (
      <Panel title="Plan">
        <p className="flex items-center gap-1.5 font-display text-lg font-semibold text-foreground">
          Brand Pro <VerifiedBadge tier="brand_verified" size="sm" />
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Your brand is verified. Thanks for supporting Kitevo.</p>
        <Button className="mt-4 w-full" onClick={openPortal} disabled={busy}>
          {busy ? "Opening…" : "Manage billing"}
        </Button>
        {errorLine}
      </Panel>
    );
  }

  // ── Upgrade CTA ──
  const monthly = BRAND_TIER.priceMonthly;
  const perMonth = billing === "yearly" && BRAND_TIER.priceYearly ? yearlyPerMonth(BRAND_TIER.priceYearly) : monthly;
  const yearlySavings = BRAND_TIER.priceYearly ? monthly * 12 - BRAND_TIER.priceYearly : 0;
  const seg = (on: boolean) =>
    `flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <Panel title="Plan" action={<span className="text-xs font-medium text-muted-foreground">Free</span>}>
      {justUpgraded && (
        <div role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-xs text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
          Payment received. Your Brand Pro badge will appear in a moment.
        </div>
      )}

      <p className="flex items-center gap-1.5 font-display text-lg font-semibold text-foreground">
        Brand Pro <VerifiedBadge tier="brand_verified" size="sm" />
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">Stand out to creators and run more campaigns.</p>

      <div role="radiogroup" aria-label="Billing period" className="mt-4 flex rounded-full bg-muted p-0.5">
        <button type="button" role="radio" aria-checked={billing === "monthly"} onClick={() => setBilling("monthly")} className={seg(billing === "monthly")}>
          Monthly
        </button>
        <button type="button" role="radio" aria-checked={billing === "yearly"} onClick={() => setBilling("yearly")} className={seg(billing === "yearly")}>
          Yearly{yearlySavings > 0 && <span className="ml-1 text-green-600 dark:text-green-400">−${yearlySavings}</span>}
        </button>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-semibold tabular-nums text-foreground">${perMonth}</span>
        <span className="text-xs text-muted-foreground">/mo{billing === "yearly" ? ", billed yearly" : ""}</span>
      </div>

      <ul className="mt-4 space-y-2">
        {BRAND_TIER.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Check size={13} strokeWidth={2.5} className="mt-0.5 shrink-0 text-foreground" aria-hidden />
            {f}
          </li>
        ))}
      </ul>

      <Button variant="primary" className="mt-5 w-full" onClick={startCheckout} disabled={busy}>
        {busy ? "Redirecting…" : "Upgrade to Brand Pro"}
      </Button>
      {errorLine}
    </Panel>
  );
}
