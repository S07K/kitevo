"use client";

import { useEffect, useMemo, useState } from "react";
import { PayoutDetailsCard, type PayoutProfile } from "./PayoutDetailsCard";
import { PayoutMark } from "../components/PayoutLogos";
import { Check, Copy, Link2, Sparkles, Wallet } from "lucide-react";
import { WorkspaceShell, PageHeader, Panel, Eyebrow } from "@/app/components/workspace/WorkspaceShell";
import { Button } from "@/app/components/workspace/Button";
import { Skeleton, FieldSkeleton } from "@/app/components/Skeleton";

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

  const months = data?.terms.months ?? 12;
  const holdDays = data?.terms.holdDays ?? 30;
  const stats = [
    { label: "Invited", value: data ? String(data.referredCount) : null, sub: data ? `${data.payingCount} paying` : "" },
    { label: "On hold", value: data ? totalText(data.pending) : null, sub: `${holdDays}-day refund window` },
    { label: "Ready to pay", value: data ? totalText(data.available) : null, sub: `Paid monthly over ${minPayout}` },
    { label: "Paid out", value: data ? totalText(data.paid) : null, sub: "All time" },
  ];
  const steps = [
    { icon: <Link2 size={15} aria-hidden />, title: "Share your link", body: "Post it, DM it, or let your kit's “Create yours” link do it for you." },
    { icon: <Sparkles size={15} aria-hidden />, title: "They upgrade", body: "When someone who signed up with your link pays for a plan, you earn." },
    { icon: <Wallet size={15} aria-hidden />, title: `You get ${rate}%`, body: `Of every payment for ${months} months, paid monthly once you pass ${minPayout}.` },
  ];

  return (
    <WorkspaceShell width="wide">
      <PageHeader
        eyebrow="Grow"
        title="Invite & earn"
        description={<>Earn {rate}% of what every creator you invite pays Kitevo, for their first {months} months.</>}
      />

      {loadError && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          Couldn&apos;t load your referral details. Refresh to try again.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main column ── */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Invite link */}
          <Panel title="Your invite link">
            {data ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.target.select()}
                  aria-label="Your invite link"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-muted/40 px-3.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <Button variant="primary" size="lg" onClick={copy} aria-live="polite">
                  {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2" aria-hidden>
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Your media kit&apos;s &ldquo;Create yours&rdquo; link already uses it, so every brand or creator who opens your kit can become your referral.
            </p>
          </Panel>

          {/* Earnings */}
          <Panel title="Earnings" bodyClassName="">
            <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
              {stats.map((st) => (
                <div key={st.label} className="min-w-0 bg-background px-5 py-4 sm:px-6">
                  <Eyebrow>{st.label}</Eyebrow>
                  {st.value === null ? (
                    <Skeleton className="mt-2.5 h-6 w-16 rounded-full" />
                  ) : (
                    <p className="mt-1.5 truncate font-display text-2xl font-semibold tabular-nums tracking-tight text-foreground">{st.value}</p>
                  )}
                  <p className="mt-1 truncate text-xs text-muted-foreground">{st.sub}</p>
                </div>
              ))}
            </div>

            <div className="p-5 sm:p-6">
              {data && data.recent.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 pr-4 font-medium">Commission</th>
                        <th className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((c) => (
                        <tr key={c.id} className="border-b border-border last:border-0">
                          <td className="py-2.5 pr-4 tabular-nums">{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td className="py-2.5 pr-4 tabular-nums">{money(c.amount, c.currency)}</td>
                          <td className="py-2.5 text-xs text-muted-foreground">
                            {STATUS_LABEL[c.status] ?? c.status}
                            {c.status === "pending" && ` · until ${new Date(c.availableAt).toLocaleDateString()}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : data ? (
                <div className="py-4 text-center">
                  <p className="text-sm font-medium text-foreground">No commissions yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">You earn when someone who signed up with your link pays for a plan.</p>
                </div>
              ) : (
                <div className="space-y-2" aria-hidden>
                  <Skeleton className="h-3 w-full rounded-full" />
                  <Skeleton className="h-3 w-2/3 rounded-full" />
                </div>
              )}
            </div>
          </Panel>

          {/* Payout details */}
          {data ? (
            <PayoutDetailsCard
              profile={data.payoutProfile}
              hasEarnings={Object.keys(data.available).length > 0 || Object.keys(data.pending).length > 0}
              minPayoutLabel={minPayout}
              onSaved={(p) => setData((d) => (d ? { ...d, payoutProfile: p } : d))}
            />
          ) : (
            <div className="space-y-5 rounded-2xl border border-border bg-background p-5 sm:p-6" aria-hidden>
              <Skeleton className="h-3.5 w-28 rounded-full" />
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
              </div>
              <FieldSkeleton />
            </div>
          )}
        </div>

        {/* ── Rail ── */}
        <aside className="min-w-0 space-y-6">
          <Panel title="How it works" bodyClassName="p-2">
            <ol>
              {steps.map((st, i) => (
                <li key={st.title} className="flex gap-3 px-3 py-3">
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                    {st.icon}
                    <span className="sr-only">Step {i + 1}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{st.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{st.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Payout history" bodyClassName={data && data.payouts.length > 0 ? "px-5 py-2 sm:px-6" : "p-5 sm:p-6"}>
            {data && data.payouts.length > 0 ? (
              <ul className="divide-y divide-border">
                {data.payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-3">
                      <PayoutMark method={p.method} size={28} />
                      <span className="min-w-0">
                        <span className="block tabular-nums">{new Date(p.paidAt).toLocaleDateString()}</span>
                        <span className="block truncate text-xs text-muted-foreground">Ref {p.reference}</span>
                      </span>
                    </span>
                    <span className="font-medium tabular-nums">{money(p.amount, p.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : data ? (
              <p className="text-sm text-muted-foreground">No payouts yet. They&apos;re sent monthly once your balance passes {minPayout}.</p>
            ) : (
              <Skeleton className="h-3 w-4/5 rounded-full" />
            )}
          </Panel>

          <Panel title="The fine print">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Commissions are {rate}% of the pre-tax amount a referred creator pays, for {months} months from their first payment. Each one is
              held {holdDays} days in case of a refund. Refunded payments don&apos;t earn commission. Referring yourself or your own accounts
              doesn&apos;t count.
            </p>
          </Panel>
        </aside>
      </div>
    </WorkspaceShell>
  );
}
