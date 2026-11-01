"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PayoutMark } from "@/app/components/PayoutLogos";

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

const cardCls = "bg-background border-border mt-6 rounded-2xl border p-6";
const eyebrowCls = "text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground";
const btnCls =
  "inline-flex h-9 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted";

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

const key = (r: { referrerId: string; currency: string }) => `${r.referrerId}:${r.currency}`;
const METHOD_LABEL: Record<string, string> = { paypal: "PayPal", wise: "Wise", bank: "Bank" };

export function AdminPayoutsClient({ rows, recent, history }: { rows: AdminRow[]; recent: AdminCommission[]; history: AdminPayout[] }) {
  const router = useRouter();
  const payable = useMemo(() => rows.filter((r) => r.meetsMinimum && r.profile), [rows]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(payable.map(key)));
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const selectedRows = payable.filter((r) => selected.has(key(r)));
  const totals = selectedRows.reduce<Record<string, number>>((t, r) => ({ ...t, [r.currency]: (t[r.currency] ?? 0) + r.amount }), {});
  const totalLabel = Object.entries(totals).map(([c, a]) => money(a, c)).join(" + ") || "—";

  const toggle = (k: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const record = async () => {
    if (!reference.trim() || selectedRows.length === 0) return;
    if (!confirm(`Record ${totalLabel} as PAID to ${selectedRows.length} referrer(s) with reference "${reference.trim()}"?\n\nOnly do this after the money has been sent.`)) return;
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
          : { ok: true, text: "Recorded. Referrers have been emailed a receipt." }
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
    if (!confirm("Reverse this commission? Use this when the payment was refunded outside the webhook.")) return;
    const res = await fetch(`/api/admin/commissions/${id}/reverse`, { method: "POST" });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? "Failed");
    router.refresh();
  };

  return (
    <>
      {/* Step 1–3 */}
      <section className={cardCls}>
        <p className={eyebrowCls}>Due now</p>
        <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-5 text-sm">
          <li>Download the CSV: PayPal bulk format, or all details for Wise / bank.</li>
          <li>Pay the batch in PayPal or Wise.</li>
          <li>Paste the batch reference below and record it. Balances, the referrers&apos; dashboards and receipts update together.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Plain <a download>: these are file downloads from an API route, not page navigations. */}
          <a className={btnCls} href="/api/admin/payouts/export?format=paypal" download>Export PayPal CSV</a>
          <a className={btnCls} href="/api/admin/payouts/export?format=all" download>Export all details CSV</a>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground mt-6 text-sm">Nothing is due. Commissions become payable after their hold period.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-border border-b text-xs">
                  <th className="w-8 py-2" />
                  <th className="py-2 pr-4 font-medium">Referrer</th>
                  <th className="py-2 pr-4 font-medium">Pay to</th>
                  <th className="py-2 pr-4 font-medium">Country / tax ID</th>
                  <th className="py-2 pr-4 text-right font-medium">Due</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const k = key(r);
                  const canPay = r.meetsMinimum && !!r.profile;
                  return (
                    <tr key={k} className="border-border border-b align-top last:border-0">
                      <td className="py-3">
                        <input
                          type="checkbox"
                          disabled={!canPay}
                          checked={canPay && selected.has(k)}
                          onChange={() => toggle(k)}
                          aria-label={`Select ${r.email}`}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{r.profile?.legalName ?? r.name ?? "—"}</p>
                        <p className="text-muted-foreground text-xs">{r.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        {r.profile ? (
                          <div className="flex items-start gap-2.5">
                            <PayoutMark method={r.profile.method} size={28} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium">{METHOD_LABEL[r.profile.method] ?? r.profile.method}</p>
                              <p className="text-muted-foreground whitespace-pre-line break-all font-mono text-[11px]">{r.profile.destination}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-700">No payout details</span>
                        )}
                      </td>
                      <td className="text-muted-foreground py-3 pr-4 text-xs">
                        {r.profile ? `${r.profile.country}${r.profile.taxId ? ` · ${r.profile.taxId}` : ""}` : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium tabular-nums">
                        {money(r.amount, r.currency)}
                        <p className="text-muted-foreground text-[11px] font-normal">{r.commissionCount} commission{r.commissionCount === 1 ? "" : "s"}</p>
                      </td>
                      <td className="py-3 text-xs">
                        {canPay ? (
                          <span className="text-green-700">Ready</span>
                        ) : !r.meetsMinimum ? (
                          <span className="text-muted-foreground">Under {money(r.minimum, r.currency)} minimum</span>
                        ) : (
                          <span className="text-amber-700">On hold: needs details</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {payable.length > 0 && (
          <div className="border-border mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="text-muted-foreground text-xs font-medium">PayPal / Wise batch or transfer reference</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. PayPal batch 8XY12345AB"
                className="border-border bg-background text-foreground mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <button
              type="button"
              disabled={busy || !reference.trim() || selectedRows.length === 0}
              onClick={record}
              className="h-10 shrink-0 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {busy ? "Recording…" : `Record ${totalLabel} paid (${selectedRows.length})`}
            </button>
          </div>
        )}
        {message && (
          <p className={`mt-3 text-sm ${message.ok ? "text-green-700" : "text-red-700"}`} role="status">
            {message.text}
          </p>
        )}
      </section>

      <section className={cardCls}>
        <p className={eyebrowCls}>Recent commissions</p>
        {recent.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">None yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-border border-b text-xs">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Referrer → referred</th>
                  <th className="py-2 pr-4 font-medium">Payment</th>
                  <th className="py-2 pr-4 text-right font-medium">Commission</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id} className="border-border border-b last:border-0">
                    <td className="py-2.5 pr-4 tabular-nums">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-4 text-xs">
                      {c.referrerEmail} → {c.referredEmail}
                    </td>
                    <td className="text-muted-foreground py-2.5 pr-4 font-mono text-[11px]">
                      {c.paymentId} · {money(c.baseAmount, c.currency)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{money(c.amount, c.currency)}</td>
                    <td className="py-2.5 text-xs">
                      {c.status}
                      {(c.status === "pending" || c.status === "available") && c.amount > 0 && (
                        <button type="button" onClick={() => reverse(c.id)} className="text-muted-foreground ml-2 underline underline-offset-2 hover:text-foreground">
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={cardCls}>
        <p className={eyebrowCls}>Payout history</p>
        {history.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">No payouts recorded yet.</p>
        ) : (
          <ul className="divide-border mt-3 divide-y">
            {history.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="tabular-nums">{new Date(p.paidAt).toLocaleDateString()}</span>
                <span className="text-xs">{p.referrerEmail}</span>
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  <PayoutMark method={p.method} size={22} />
                  {METHOD_LABEL[p.method] ?? p.method} · {p.reference}
                </span>
                <span className="font-medium tabular-nums">{money(p.amount, p.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
