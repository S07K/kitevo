"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppNav } from "../components/AppNav";

type Totals = Record<string, number>;
type PayoutProfile = {
  method: "paypal" | "wise" | "bank";
  destination: string;
  legalName: string;
  country: string;
  taxId: string | null;
  updatedAt: string;
};
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
const labelCls = "text-xs font-medium text-muted-foreground";
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

const COUNTRIES = (() => {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    const codes =
      "AE AR AT AU BD BE BR CA CH CL CN CO CZ DE DK EG ES FI FR GB GH GR HK HU ID IE IL IN IT JP KE KR LK MX MY NG NL NO NP NZ PE PH PK PL PT RO SA SE SG TH TR TW UA US VN ZA".split(" ");
    return codes.map((c) => ({ code: c, name: names.of(c) ?? c })).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [{ code: "US", name: "United States" }];
  }
})();

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

  const [form, setForm] = useState({ method: "paypal", destination: "", legalName: "", country: "", taxId: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/referrals", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Summary) => {
        setData(d);
        if (d.payoutProfile) {
          setForm({
            method: d.payoutProfile.method,
            destination: d.payoutProfile.destination,
            legalName: d.payoutProfile.legalName,
            country: d.payoutProfile.country,
            taxId: d.payoutProfile.taxId ?? "",
          });
        }
      })
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

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/referrals/payout-profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save");
      setData((d) => (d ? { ...d, payoutProfile: body.payoutProfile } : d));
      setSaveMsg({ ok: true, text: "Payout details saved." });
    } catch (err) {
      setSaveMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save" });
    } finally {
      setSaving(false);
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
        <section className={cardCls}>
          <p className={eyebrowCls}>Payout details</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Where we send your earnings. Payouts go out once a month when your balance is over {minPayout}.
          </p>
          {data && !data.payoutProfile && (Object.keys(data.available).length > 0 || Object.keys(data.pending).length > 0) && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Add your payout details so we can pay you.
            </div>
          )}
          <form onSubmit={save} className="mt-4 space-y-4">
            <div>
              <span className={labelCls}>Payout method</span>
              <div className="mt-1 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payout method">
                {[
                  { id: "paypal", label: "PayPal" },
                  { id: "wise", label: "Wise" },
                  { id: "bank", label: "Bank transfer" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={form.method === m.id}
                    onClick={() => setForm((f) => ({ ...f, method: m.id }))}
                    className={`h-10 rounded-xl border text-sm font-medium transition-colors ${
                      form.method === m.id ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className={labelCls}>
                {form.method === "paypal" ? "PayPal email" : form.method === "wise" ? "Wise account email" : "Bank details"}
              </span>
              {form.method === "bank" ? (
                <textarea
                  required
                  rows={4}
                  value={form.destination}
                  onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                  placeholder={"Account holder name\nAccount number or IBAN\nBank name and SWIFT/BIC (or IFSC / routing number)"}
                  className={inputCls}
                />
              ) : (
                <input
                  required
                  type="email"
                  value={form.destination}
                  onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              )}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Full legal name</span>
                <input
                  required
                  value={form.legalName}
                  onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Country</span>
                <select
                  required
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className={labelCls}>Tax ID (optional)</span>
              <input
                value={form.taxId}
                onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                placeholder="e.g. PAN, VAT or TIN — if your country requires one"
                className={inputCls}
              />
            </label>

            <p className="text-muted-foreground text-xs">Stored encrypted. Only used to send you your earnings.</p>

            {saveMsg && (
              <p className={`text-sm ${saveMsg.ok ? "text-green-700" : "text-red-700"}`} role="status">
                {saveMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-full bg-foreground px-8 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save payout details"}
            </button>
          </form>
        </section>

        {data && data.payouts.length > 0 && (
          <section className={cardCls}>
            <p className={eyebrowCls}>Payout history</p>
            <ul className="mt-3 divide-y divide-border">
              {data.payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="tabular-nums">{new Date(p.paidAt).toLocaleDateString()}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {p.method} · {p.reference}
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
