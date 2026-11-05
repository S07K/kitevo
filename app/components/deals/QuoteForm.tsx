"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/app/components/workspace/Button";
import { ADVANCE_OPTIONS, DEAL_CURRENCIES, MAX_DELIVERABLES, planLabel, splitPlan, type PaymentPlan } from "@/lib/deals-shared";
import { formatPrice } from "@/lib/commerce-shared";

// Base input look without a width, so fixed-width fields (quantity, currency) don't fight w-full.
const box =
  "min-w-0 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";
const field = `w-full ${box}`;

export type QuoteDraft = {
  deliverables: { label: string; quantity: number }[];
  amount: string;
  currency: string;
  paymentPlan: PaymentPlan;
  advancePct: number;
  dueDate: string;
  notes: string;
};
export const EMPTY_QUOTE: QuoteDraft = { deliverables: [{ label: "", quantity: 1 }], amount: "", currency: "INR", paymentPlan: "upfront", advancePct: 50, dueDate: "", notes: "" };

/** Deliverables, amount, payment plan, due date and notes: a quote, an offer or a counter. */
export function QuoteForm({ value, onChange, error }: { value: QuoteDraft; onChange: (v: QuoteDraft) => void; error?: { field?: string; message: string } | null }) {
  const set = (patch: Partial<QuoteDraft>) => onChange({ ...value, ...patch });
  const err = (f: string) => (error?.field === f ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error.message}</p> : null);
  const cents = Math.round(Number(value.amount) * 100);
  const parts = Number.isFinite(cents) && cents > 0 ? splitPlan({ amountCents: cents, paymentPlan: value.paymentPlan, advancePct: value.advancePct }) : [];

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Deliverables</p>
        <div className="space-y-2">
          {value.deliverables.map((d, i) => (
            <div key={i} className="flex gap-2">
              <input
                aria-label={`Deliverable ${i + 1}`}
                value={d.label}
                onChange={(e) => set({ deliverables: value.deliverables.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                placeholder={i === 0 ? "e.g. Instagram Reel (60s) with link sticker" : "e.g. 3 Stories"}
                className={`${box} flex-1`}
              />
              <input
                aria-label={`Quantity ${i + 1}`}
                type="number"
                min={1}
                max={100}
                value={d.quantity}
                onChange={(e) => set({ deliverables: value.deliverables.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) || 1 } : x)) })}
                className={`${box} w-20 shrink-0 text-center`}
              />
              {value.deliverables.length > 1 && (
                <button type="button" aria-label="Remove deliverable" onClick={() => set({ deliverables: value.deliverables.filter((_, j) => j !== i) })} className="shrink-0 rounded-lg px-2 text-muted-foreground hover:text-foreground">
                  <X size={16} aria-hidden />
                </button>
              )}
            </div>
          ))}
        </div>
        {value.deliverables.length < MAX_DELIVERABLES && (
          <button type="button" onClick={() => set({ deliverables: [...value.deliverables, { label: "", quantity: 1 }] })} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
            <Plus size={13} aria-hidden /> Add a deliverable
          </button>
        )}
        {err("deliverables")}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="q-amount" className="mb-1.5 block text-xs font-medium text-muted-foreground">Total amount</label>
          <div className="flex gap-2">
            <select aria-label="Currency" value={value.currency} onChange={(e) => set({ currency: e.target.value })} className={`${box} w-24 shrink-0 px-2.5`}>
              {DEAL_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c === "INR" ? "₹ INR" : "$ USD"}</option>
              ))}
            </select>
            <input id="q-amount" inputMode="decimal" value={value.amount} onChange={(e) => set({ amount: e.target.value.replace(/[^\d.]/g, "") })} placeholder="25000" className={`${box} flex-1`} />
          </div>
          {err("amount")}
        </div>
        <div>
          <label htmlFor="q-due" className="mb-1.5 block text-xs font-medium text-muted-foreground">Due date (optional)</label>
          <input id="q-due" type="date" value={value.dueDate} onChange={(e) => set({ dueDate: e.target.value })} className={field} />
          {err("dueDate")}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Payment</p>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Payment plan">
          {([
            ["upfront", "Full upfront", "When the deal is agreed"],
            ["split", "Advance + balance", "Part now, rest on delivery"],
            ["on_delivery", "On delivery", "After the work is delivered"],
          ] as const).map(([p, label, hint]) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={value.paymentPlan === p}
              onClick={() => set({ paymentPlan: p })}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${value.paymentPlan === p ? "border-primary bg-primary-soft" : "border-border hover:border-primary"}`}
            >
              <span className="block text-sm font-medium text-foreground">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>
        {value.paymentPlan === "split" && (
          <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
            Advance
            <select value={value.advancePct} onChange={(e) => set({ advancePct: Number(e.target.value) })} className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
              {ADVANCE_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}%</option>
              ))}
            </select>
            on acceptance
          </label>
        )}
        {parts.length === 1 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {planLabel(value)}: <strong className="font-medium text-foreground">{formatPrice(parts[0].amountCents, value.currency)}</strong>
          </p>
        )}
        {parts.length > 1 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {planLabel(value)}:{" "}
            {parts.map((p, i) => (
              <span key={i}>
                {i > 0 && " + "}
                <strong className="font-medium text-foreground">{formatPrice(p.amountCents, value.currency)}</strong> {p.payableOn === "acceptance" ? "on acceptance" : "on delivery"}
              </span>
            ))}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="q-notes" className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
        <textarea id="q-notes" rows={3} value={value.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Usage rights, revisions, posting window…" className={`${field} resize-none`} />
      </div>
    </div>
  );
}

export function quotePayload(q: QuoteDraft) {
  return { ...q, deliverables: q.deliverables.filter((d) => d.label.trim()) };
}

export function SubmitRow({ busy, label, onCancel }: { busy: boolean; label: string; onCancel?: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      {onCancel && <Button onClick={onCancel} disabled={busy}>Cancel</Button>}
      <Button type="submit" variant="primary" disabled={busy}>{busy ? "Sending…" : label}</Button>
    </div>
  );
}
