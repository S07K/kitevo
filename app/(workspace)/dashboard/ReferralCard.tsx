"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Copy, Check, ArrowRight } from "lucide-react";
import { REFERRAL_RATE_PCT, REFERRAL_TERMS } from "@/lib/referral-terms";

type Totals = Record<string, number>;
type Summary = { code: string; referredCount: number; pending: Totals; available: Totals; paid: Totals };

function sum(t: Totals) {
  return Object.values(t).reduce((a, b) => a + b, 0);
}
function usd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/**
 * Dashboard prompt for the referral program: invite link with one-tap copy, and once
 * there's activity, the creator's earnings. Always visible — referrals are the main
 * growth loop.
 */
export function ReferralCard({ compact = false }: { compact?: boolean } = {}) {
  const [data, setData] = useState<Summary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});
  }, []);

  const link = data ? `${window.location.origin}/?ref=${data.code}` : "";
  const earned = data ? sum(data.pending) + sum(data.available) + sum(data.paid) : 0;

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  if (compact) {
    return (
      <div className="overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Gift size={16} strokeWidth={1.8} aria-hidden />
          <p className="text-sm font-semibold">Earn {REFERRAL_RATE_PCT}% for a year</p>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed opacity-70">
          {data && earned > 0
            ? `${usd(earned)} earned from ${data.referredCount} invite${data.referredCount === 1 ? "" : "s"}.`
            : "Invite creators with your link. When they upgrade, you get paid every month."}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={copy}
            disabled={!data}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-background text-xs font-medium text-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            {copied ? "Copied" : "Copy invite link"}
          </button>
          <Link href="/referrals" className="inline-flex h-9 items-center rounded-full px-3 text-xs font-medium opacity-80 transition-opacity hover:opacity-100">
            Earnings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted/60 to-background">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Gift size={20} strokeWidth={1.8} aria-hidden />
          </span>
          <div>
            <p className="text-base font-semibold text-foreground">
              Invite creators, earn {REFERRAL_RATE_PCT}% for {REFERRAL_TERMS.months} months
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {data && earned > 0
                ? `${usd(earned)} earned so far from ${data.referredCount} invite${data.referredCount === 1 ? "" : "s"}. ${usd(sum(data.available))} ready to pay.`
                : data && data.referredCount > 0
                  ? `${data.referredCount} creator${data.referredCount === 1 ? " has" : "s have"} joined with your link. You earn when they upgrade.`
                  : "Share your link. When a creator you invite upgrades, you get paid every month."}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <div className="flex h-10 min-w-0 flex-1 items-center rounded-full border border-border bg-background px-4 font-mono text-xs text-muted-foreground lg:w-64">
            <span className="truncate">{data ? link.replace(/^https?:\/\//, "") : "Loading your link…"}</span>
          </div>
          <button
            type="button"
            onClick={copy}
            disabled={!data}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <Link
            href="/referrals"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Earnings <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
