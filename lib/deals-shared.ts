/**
 * Brand deals (client-safe): quote validation, how a payment plan splits into payments, and
 * who may do what in each state. Money is integer minor units. Server logic: lib/deals.ts.
 */
import { MAX_PRICE_MINOR, MIN_PRICE_MINOR, PRODUCT_CURRENCIES, type ProductCurrency } from "@/lib/commerce-shared";

export const DEAL_CURRENCIES = PRODUCT_CURRENCIES;
export const MAX_DELIVERABLES = 10;
export const MAX_DEAL_TITLE = 100;
export const MAX_DEAL_NOTES = 1000;
export const ADVANCE_OPTIONS = [25, 30, 40, 50, 60, 70, 75] as const;

export type Deliverable = { label: string; quantity: number };
export type PaymentPlan = "upfront" | "split" | "on_delivery";
export type Quote = {
  deliverables: Deliverable[];
  amountCents: number;
  currency: ProductCurrency;
  paymentPlan: PaymentPlan;
  /** Only for "split": % paid on acceptance; the rest on delivery. */
  advancePct: number;
  dueDate: string | null; // YYYY-MM-DD
  notes: string;
};
export type DealRole = "creator" | "brand";
export type DealStatus = "proposed" | "accepted" | "delivered" | "completed" | "declined" | "cancelled";

/** Clean a quote/offer from the form or API, or return the first problem. */
export function normalizeQuote(raw: unknown): { ok: true; value: Quote } | { ok: false; field: string; error: string } {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const deliverables = (Array.isArray(o.deliverables) ? o.deliverables : [])
    .map((d) => (d && typeof d === "object" ? (d as Record<string, unknown>) : {}))
    .map((d) => ({
      label: typeof d.label === "string" ? d.label.trim().replace(/\s+/g, " ").slice(0, 120) : "",
      quantity: Math.min(100, Math.max(1, Math.round(Number(d.quantity) || 1))),
    }))
    .filter((d) => d.label)
    .slice(0, MAX_DELIVERABLES);
  if (!deliverables.length) return { ok: false, field: "deliverables", error: "Add at least one deliverable (e.g. 1 Instagram Reel)." };

  const major = typeof o.amount === "number" || typeof o.amount === "string" ? Number(o.amount) : NaN;
  const amountCents = Number.isFinite(major) ? Math.round(major * 100) : typeof o.amountCents === "number" ? Math.round(o.amountCents) : NaN;
  if (!Number.isFinite(amountCents) || amountCents < MIN_PRICE_MINOR) return { ok: false, field: "amount", error: "Enter the deal amount (at least 1.00)." };
  if (amountCents > MAX_PRICE_MINOR) return { ok: false, field: "amount", error: "That amount is too high." };
  const currency = (DEAL_CURRENCIES as readonly string[]).includes(String(o.currency)) ? (o.currency as ProductCurrency) : "INR";

  const paymentPlan: PaymentPlan = o.paymentPlan === "split" || o.paymentPlan === "on_delivery" ? o.paymentPlan : "upfront";
  const pct = Math.round(Number(o.advancePct));
  const advancePct = paymentPlan === "split" ? ((ADVANCE_OPTIONS as readonly number[]).includes(pct) ? pct : 50) : 0;

  let dueDate: string | null = null;
  if (typeof o.dueDate === "string" && o.dueDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.dueDate) || Number.isNaN(Date.parse(o.dueDate))) return { ok: false, field: "dueDate", error: "Pick a valid due date." };
    dueDate = o.dueDate;
  }
  const notes = typeof o.notes === "string" ? o.notes.trim().slice(0, MAX_DEAL_NOTES) : "";
  return { ok: true, value: { deliverables, amountCents, currency, paymentPlan, advancePct, dueDate, notes } };
}

export type PlannedPayment = { kind: "full" | "advance" | "balance"; amountCents: number; payableOn: "acceptance" | "delivery" };

/** The payments a plan creates. The parts always add up to the exact amount (balance takes the rounding). */
export function splitPlan(q: Pick<Quote, "amountCents" | "paymentPlan" | "advancePct">): PlannedPayment[] {
  if (q.paymentPlan === "on_delivery") return [{ kind: "full", amountCents: q.amountCents, payableOn: "delivery" }];
  if (q.paymentPlan === "split") {
    const advance = Math.round((q.amountCents * q.advancePct) / 100);
    return [
      { kind: "advance", amountCents: advance, payableOn: "acceptance" },
      { kind: "balance", amountCents: q.amountCents - advance, payableOn: "delivery" },
    ];
  }
  return [{ kind: "full", amountCents: q.amountCents, payableOn: "acceptance" }];
}

export function planLabel(q: Pick<Quote, "paymentPlan" | "advancePct">): string {
  if (q.paymentPlan === "on_delivery") return "Paid in full on delivery";
  if (q.paymentPlan === "split") return `${q.advancePct}% on acceptance, ${100 - q.advancePct}% on delivery`;
  return "Paid in full on acceptance";
}

/**
 * What a side may do now. `openBy` = who proposed the version awaiting a reply (if any);
 * `anyPaid` = some payment already went through (terms are then fixed).
 */
export function allowedActions(p: { role: DealRole; status: DealStatus; openBy: DealRole | null; anyPaid: boolean }) {
  const live = p.status === "proposed" || p.status === "accepted" || p.status === "delivered";
  const awaitingMe = p.status === "proposed" && p.openBy !== null && p.openBy !== p.role;
  return {
    accept: awaitingMe,
    decline: awaitingMe,
    // Counter/revise: reply to the other side's version, or change accepted terms before money moves.
    propose: live && p.status !== "delivered" && !p.anyPaid && (awaitingMe || p.status === "accepted"),
    withdraw: p.status === "proposed" && p.openBy === p.role,
    cancel: live && !p.anyPaid,
    markDelivered: p.role === "creator" && p.status === "accepted",
    pay: p.role === "brand",
  };
}

export const STATUS_LABEL: Record<DealStatus, string> = {
  proposed: "Awaiting reply",
  accepted: "Agreed",
  delivered: "Delivered",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};
