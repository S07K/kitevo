"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppNav } from "../components/AppNav";
import { PayoutDetailsCard, type PayoutProfile } from "./PayoutDetailsCard";
import { PayoutMark } from "../components/PayoutLogos";

type Totals = Record<string, number>;
type Summary = {
  code: string;
  terms: { rateBps: number; months: number; holdDays: number; defaultMinPayout: number; minPayout: Record<string, number> };
  referredCount: number;
  payingCount: number;
  pending: Totals;
  available: Totals;
  paid: Totals;
  recent: Array<{ id: string; amount: number; currency: string; status: string; availableAt: string; createdAt: string }>;
  payouts: Array<{ id: string; amount: number; currency: string; method: string; reference: string; paidAt: string }>;
  payoutProfile: PayoutProfile | null;
};

const inputCls =
  "mt-1 w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition";
const cardCls = "bg-background border-border mt-6 rounded-2xl border p-6";
const eyebrowCls = "text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground";

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

/** "$12.00" for one currency, "$12.00 + ₹400.00" for several, "$0.00" for none. */
function totalText(t: Totals) {
  const entries = Object.entries(t).filter(([, v]) => v !== 0);
  return entries.length ? entries.map(([c, v]) => money(v, c)).join(" + ") : money(0, "USD");
}


const STATUS_LABEL: Record<string, string> = {
  pending: "On hold",
  available: "Ready to pay",
  paid: "Paid",
  reversed: "Refunded",
};

export default function ReferralsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);


  useEffect(() => {
    fetch("/api/referrals", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Summary) => setData(d))
      .catch(() => setLoadError(true));
  }, []);

  const link = useMemo(() => {
    if (!data) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/?ref=${data.code}`;
  }, [data]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is visible to copy by hand */
    }
  };

  const rate = data ? data.terms.rateBps / 100 : 20;
  const minPayout = data ? money(data.terms.minPayout.USD ?? data.terms.defaultMinPayout, "USD") : "$25.00";

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNav links={[{ href: "/dashboard", label: "Dashboard" }]} />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-24 sm:px-8">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to dashboard
        </Link>

        <h1 className="font-display text-foreground mt-4 text-2xl font-semibold tracking-tight">Invite &amp; earn</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Earn {rate}% of what every creator you invite pays Kitevo, for their first {data?.terms.months ?? 12} months.
        </p>

        {loadError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Couldn&apos;t load your referral details. Refresh to try again.
          </div>
        )}

        {/* Link */}
        <section className={cardCls}>
          <p className={eyebrowCls}>Your invite link</p>
          {data ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={link} className={`${inputCls} mt-0 font-mono text-xs`} onFocus={(e) => e.target.select()} aria-label="Your invite link" />
              <button
                type="button"
                onClick={copy}
                className="h-10 shrink-0 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-80"
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          ) : (
            <div className="mt-3 h-10 animate-pulse rounded-xl bg-muted" />
          )}
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Your media kit&apos;s &ldquo;Create yours&rdquo; link already uses it, so every brand or creator who opens your kit can become your referral.
          </p>
        </section>

        {/* Earnings */}
        <section className={cardCls}>
          <p className={eyebrowCls}>Earnings</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Invited", value: data ? String(data.referredCount) : "—", sub: data ? `${data.payingCount} paying` : "" },
              { label: "On hold", value: data ? totalText(data.pending) : "—", sub: `${data?.terms.holdDays ?? 30}-day refund window` },
              { label: "Ready to pay", value: data ? totalText(data.available) : "—", sub: `Paid monthly over ${minPayout}` },
              { label: "Paid out", value: data ? totalText(data.paid) : "—", sub: "All time" },
            ].map((s) => (
              <div key={s.label} className="min-w-0">
                <p className="text-muted-foreground text-xs">{s.label}</p>
                <p className="text-foreground mt-1 truncate text-lg font-semibold tabular-nums">{s.value}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">{s.sub}</p>
              </div>
            ))}
          </div>

          {data && data.recent.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground border-border border-b text-xs">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Commission</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((c) => (
                    <tr key={c.id} className="border-border border-b last:border-0">
                      <td className="py-2.5 pr-4 tabular-nums">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{money(c.amount, c.currency)}</td>
                      <td className="text-muted-foreground py-2.5 text-xs">
                        {STATUS_LABEL[c.status] ?? c.status}
                        {c.status === "pending" && ` · until ${new Date(c.availableAt).toLocaleDateString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && data.recent.length === 0 && (
            <p className="text-muted-foreground mt-6 text-sm">
              No commissions yet. You earn when someone who signed up with your link pays for a plan.
            </p>
          )}
        </section>

        {/* Payout details */}
        {data ? (
          <PayoutDetailsCard
            profile={data.payoutProfile}
            hasEarnings={Object.keys(data.available).length > 0 || Object.keys(data.pending).length > 0}
            minPayoutLabel={minPayout}
            onSaved={(p) => setData((d) => (d ? { ...d, payoutProfile: p } : d))}
          />
        ) : (
          <div className="bg-background border-border mt-6 h-56 animate-pulse rounded-2xl border" />
        )}

        {data && data.payouts.length > 0 && (
          <section className={cardCls}>
            <p className={eyebrowCls}>Payout history</p>
            <ul className="mt-3 divide-y divide-border">
              {data.payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <PayoutMark method={p.method} size={28} />
                    <span className="min-w-0">
                      <span className="block tabular-nums">{new Date(p.paidAt).toLocaleDateString()}</span>
                      <span className="text-muted-foreground block truncate text-xs">Ref {p.reference}</span>
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">{money(p.amount, p.currency)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-muted-foreground mt-6 text-xs leading-relaxed">
          Commissions are {rate}% of the pre-tax amount a referred creator pays, for {data?.terms.months ?? 12} months from their first payment.
          Each one is held {data?.terms.holdDays ?? 30} days in case of a refund. Refunded payments don&apos;t earn commission. Referring
          yourself or your own accounts doesn&apos;t count.
        </p>
      </main>
    </div>
  );
}
