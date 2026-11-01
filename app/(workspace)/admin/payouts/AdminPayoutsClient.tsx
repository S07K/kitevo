"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Clock, CircleDollarSign, Users, AlertTriangle } from "lucide-react";
import { PayoutMark } from "@/app/components/PayoutLogos";
import { countryName, flagEmoji } from "@/lib/countries";

export type AdminRow = {
  referrerId: string;
  name: string | null;
  email: string;
  currency: string;
  amount: number;
  commissionCount: number;
  meetsMinimum: boolean;
  minimum: number;
  profile: { method: string; destination: string; legalName: string; country: string; taxId: string | null } | null;
};
export type AdminCommission = {
  id: string;
  amount: number;
  baseAmount: number;
  currency: string;
  status: string;
  availableAt: string;
  createdAt: string;
  paymentId: string;
  referrerEmail: string;
  referredEmail: string;
};
export type AdminPayout = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  paidAt: string;
  referrerEmail: string;
};
export type AdminStats = {
  onHold: Record<string, number>;
  onHoldCount: number;
  paid: Record<string, number>;
  referredUsers: number;
  referrers: number;
};

const card = "rounded-2xl border border-border bg-background";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const METHOD_LABEL: Record<string, string> = { paypal: "PayPal", wise: "Wise", bank: "Bank transfer" };
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  available: "bg-primary-soft text-primary-soft-foreground",
  paid: "bg-green-500/10 text-green-700 dark:text-green-400",
  reversed: "bg-muted text-muted-foreground",
};
const STATUS_LABEL: Record<string, string> = { pending: "On hold", available: "Payable", paid: "Paid", reversed: "Reversed" };

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}
function totalsText(t: Record<string, number>) {
  const e = Object.entries(t).filter(([, v]) => v);
  return e.length ? e.map(([c, v]) => money(v, c)).join(" + ") : "$0.00";
}
const key = (r: { referrerId: string; currency: string }) => `${r.referrerId}:${r.currency}`;

// Fixed locale + zone so the server render and the browser agree (no hydration mismatch).
const DATE_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const fmtDate = (iso: string) => DATE_FMT.format(new Date(iso));

/** Click-to-copy value, for pasting into PayPal / Wise / a bank form. */
function CopyValue({ value, label, mono = true }: { value: string; label?: string; mono?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="group flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
      title="Copy"
    >
      <span className="min-w-0">
        {label && <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>}
        <span className={`block break-all text-[13px] text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
      </span>
      <span className="shrink-0 text-muted-foreground opacity-40 transition-opacity group-hover:opacity-100">
        {done ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
      </span>
    </button>
  );
}

/** Bank destination arrives formatted as "Label: value" lines; split into copyable fields. */
function DestinationFields({ method, destination }: { method: string; destination: string }) {
  if (method !== "bank") return <CopyValue label={`${METHOD_LABEL[method] ?? method} email`} value={destination} />;
  const lines = destination.split("\n").map((l) => {
    const i = l.indexOf(": ");
    return i > 0 ? { label: l.slice(0, i), value: l.slice(i + 2) } : { label: "", value: l };
  });
  return (
    <div className="grid gap-0.5 sm:grid-cols-2">
      {lines.map((l) => (
        <CopyValue key={l.label + l.value} label={l.label} value={l.value} mono={l.label !== "Account holder" && l.label !== "Bank"} />
      ))}
    </div>
  );
}

export function AdminPayoutsClient({
  rows,
  recent,
  history,
  stats,
}: {
  rows: AdminRow[];
  recent: AdminCommission[];
  history: AdminPayout[];
  stats: AdminStats;
}) {
  const router = useRouter();
  const payable = useMemo(() => rows.filter((r) => r.meetsMinimum && r.profile), [rows]);
  const waiting = useMemo(() => rows.filter((r) => !(r.meetsMinimum && r.profile)), [rows]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(payable.map(key)));
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<"commissions" | "history">("commissions");

  const selectedRows = payable.filter((r) => selected.has(key(r)));
  const sumBy = (list: AdminRow[]) =>
    list.reduce<Record<string, number>>((t, r) => ({ ...t, [r.currency]: (t[r.currency] ?? 0) + r.amount }), {});
  const selTotals = sumBy(selectedRows);
  const dueTotals = sumBy(payable);

  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const record = async () => {
    if (!reference.trim() || selectedRows.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/payouts/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, items: selectedRows.map((r) => ({ referrerId: r.referrerId, currency: r.currency })) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed");
      const failed = (body.results as Array<{ error?: string }>).filter((r) => r.error);
      setMessage(
        failed.length
          ? { ok: false, text: `${failed.length} could not be recorded: ${failed.map((f) => f.error).join("; ")}` }
          : { ok: true, text: `Marked ${selectedRows.length} payout${selectedRows.length === 1 ? "" : "s"} as paid. Receipts sent.` }
      );
      setReference("");
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  };

  const reverse = async (id: string) => {
    if (!window.confirm("Reverse this commission? Use this when the payment was refunded outside the webhook.")) return;
    const res = await fetch(`/api/admin/commissions/${id}/reverse`, { method: "POST" });
    if (!res.ok) setMessage({ ok: false, text: (await res.json().catch(() => ({}))).error ?? "Could not reverse" });
    router.refresh();
  };

  const kpis = [
    { icon: CircleDollarSign, label: "Due now", value: totalsText(dueTotals), sub: `${payable.length} referrer${payable.length === 1 ? "" : "s"} ready` },
    { icon: AlertTriangle, label: "Waiting", value: String(waiting.length), sub: "under minimum or no details" },
    { icon: Clock, label: "On hold", value: totalsText(stats.onHold), sub: `${stats.onHoldCount} in refund window` },
    { icon: Users, label: "Paid all time", value: totalsText(stats.paid), sub: `${stats.referrers} referrers · ${stats.referredUsers} referred` },
  ];

  return (
    <div className="pb-28">
      {/* KPIs */}
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${card} p-5`}>
            <div className="flex items-center gap-2 text-muted-foreground">
              <k.icon size={15} strokeWidth={1.8} aria-hidden />
              <span className="text-xs font-medium">{k.label}</span>
            </div>
            <p className="mt-3 truncate text-2xl font-semibold tracking-tight tabular-nums text-foreground">{k.value}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Ready to pay */}
      <section className="mt-10">
        <p className={eyebrow}>Ready to pay</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Send each payment from PayPal, Wise or your bank using the details below (click any field to copy), then mark them paid.
        </p>

        {payable.length === 0 ? (
          <div className={`${card} mt-4 flex flex-col items-center px-6 py-14 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Check size={20} className="text-muted-foreground" />
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">You&apos;re all caught up</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Nothing is payable right now. Commissions become payable after their hold period, once a referrer passes the minimum.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {payable.map((r) => {
              const k = key(r);
              const on = selected.has(k);
              const p = r.profile!;
              return (
                <div key={k} className={`${card} overflow-hidden transition-shadow ${on ? "ring-2 ring-foreground/80" : ""}`}>
                  <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-4">
                      <input type="checkbox" checked={on} onChange={() => toggle(k)} className="mt-3 h-4 w-4 accent-foreground" aria-label={`Select ${r.email}`} />
                      <PayoutMark method={p.method} size={44} />
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-foreground">{p.legalName}</span>
                        <span className="block truncate text-sm text-muted-foreground">{r.email}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {flagEmoji(p.country)} {countryName(p.country)}
                          {p.taxId ? ` · Tax ID ${p.taxId}` : ""} · {METHOD_LABEL[p.method]}
                        </span>
                      </span>
                    </label>

                    <div className="min-w-0 rounded-xl bg-muted/40 p-1.5 lg:w-[380px]">
                      <DestinationFields method={p.method} destination={p.destination} />
                    </div>

                    <div className="flex items-center justify-between gap-4 lg:w-44 lg:flex-col lg:items-end">
                      <div className="lg:text-right">
                        <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{money(r.amount, r.currency)}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.commissionCount} commission{r.commissionCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="w-28 lg:w-full">
                        <CopyValue label={`Amount (${r.currency})`} value={(r.amount / 100).toFixed(2)} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Waiting */}
      {waiting.length > 0 && (
        <section className="mt-10">
          <p className={eyebrow}>Waiting</p>
          <div className={`${card} mt-4 divide-y divide-border`}>
            {waiting.map((r) => (
              <div key={key(r)} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {r.profile ? (
                    <PayoutMark method={r.profile.method} size={32} />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-xs font-semibold text-muted-foreground">
                      {(r.name ?? r.email)[0]?.toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.profile?.legalName ?? r.name ?? r.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      r.profile ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {r.profile ? `Under ${money(r.minimum, r.currency)} minimum` : "No payout details yet"}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{money(r.amount, r.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Activity */}
      <section className="mt-10">
        <div className="inline-flex rounded-full bg-muted p-1" role="tablist">
          {(["commissions", "history"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-8 rounded-full px-4 text-xs font-medium transition-colors ${
                tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "commissions" ? `Commissions (${recent.length})` : `Payout history (${history.length})`}
            </button>
          ))}
        </div>

        <div className={`${card} mt-4 overflow-x-auto`}>
          {tab === "commissions" ? (
            recent.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No commissions yet. They appear here as referred creators pay.</p>
            ) : (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Referrer</th>
                    <th className="px-5 py-3 font-medium">Referred creator</th>
                    <th className="px-5 py-3 text-right font-medium">Payment</th>
                    <th className="px-5 py-3 text-right font-medium">Commission</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{fmtDate(c.createdAt)}</td>
                      <td className="px-5 py-3">{c.referrerEmail}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.referredEmail}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{money(c.baseAmount, c.currency)}</td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums">{money(c.amount, c.currency)}</td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[c.status] ?? "bg-muted"}`}>
                            {STATUS_LABEL[c.status] ?? c.status}
                          </span>
                          {(c.status === "pending" || c.status === "available") && c.amount > 0 && (
                            <button
                              type="button"
                              onClick={() => reverse(c.id)}
                              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                            >
                              Reverse
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : history.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No payouts recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <PayoutMark method={h.method} size={30} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{h.referrerEmail}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {fmtDate(h.paidAt)} · Ref {h.reference}
                      </span>
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{money(h.amount, h.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Sticky action bar */}
      {payable.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-8">
            <p className="shrink-0 text-sm">
              <span className="font-semibold text-foreground">{selectedRows.length} selected</span>
              <span className="text-muted-foreground"> · {totalsText(selTotals)}</span>
            </p>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="PayPal / Wise / bank reference for this batch"
              className="h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <button
              type="button"
              disabled={busy || !reference.trim() || selectedRows.length === 0}
              onClick={record}
              className="h-10 shrink-0 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Mark as paid"}
            </button>
          </div>
          {message && (
            <p
              className={`mx-auto max-w-6xl px-4 pb-3 text-sm sm:px-8 ${message.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
              role="status"
            >
              {message.text}
            </p>
          )}
        </div>
      )}
      {payable.length === 0 && message && (
        <p className={`mt-4 text-sm ${message.ok ? "text-green-700" : "text-red-700"}`} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
