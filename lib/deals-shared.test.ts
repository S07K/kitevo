import { describe, it, expect } from "vitest";
import { allowedActions, normalizeQuote, planLabel, splitPlan } from "./deals-shared";

const base = { deliverables: [{ label: "Instagram Reel", quantity: 1 }], amount: "25000", currency: "INR" };

describe("normalizeQuote", () => {
  it("cleans a quote: deliverables, minor units, currency, plan", () => {
    const r = normalizeQuote({ ...base, deliverables: [{ label: "  Reel  ", quantity: "2" }, { label: "" }], paymentPlan: "split", advancePct: 40, dueDate: "2026-12-01", notes: " brief " });
    expect(r).toEqual({ ok: true, value: { deliverables: [{ label: "Reel", quantity: 2 }], amountCents: 2500000, currency: "INR", paymentPlan: "split", advancePct: 40, dueDate: "2026-12-01", notes: "brief" } });
  });
  it("defaults: upfront, INR, 50% when an unknown split % is sent", () => {
    expect(normalizeQuote({ ...base, currency: "BTC" }).ok && (normalizeQuote({ ...base, currency: "BTC" }) as { value: { currency: string; paymentPlan: string } }).value).toMatchObject({ currency: "INR", paymentPlan: "upfront" });
    expect((normalizeQuote({ ...base, paymentPlan: "split", advancePct: 99 }) as { value: { advancePct: number } }).value.advancePct).toBe(50);
  });
  it.each([
    [{ ...base, deliverables: [] }, "deliverables"],
    [{ ...base, amount: "0.5" }, "amount"],
    [{ ...base, amount: "abc" }, "amount"],
    [{ ...base, amount: "100000000" }, "amount"],
    [{ ...base, dueDate: "next week" }, "dueDate"],
  ])("refuses %j", (q, field) => expect(normalizeQuote(q)).toMatchObject({ ok: false, field }));
});

describe("splitPlan", () => {
  it("upfront and on-delivery are one payment", () => {
    expect(splitPlan({ amountCents: 100000, paymentPlan: "upfront", advancePct: 0 })).toEqual([{ kind: "full", amountCents: 100000, payableOn: "acceptance" }]);
    expect(splitPlan({ amountCents: 100000, paymentPlan: "on_delivery", advancePct: 0 })).toEqual([{ kind: "full", amountCents: 100000, payableOn: "delivery" }]);
  });
  it("split parts always add up exactly, even with rounding", () => {
    const parts = splitPlan({ amountCents: 99999, paymentPlan: "split", advancePct: 30 });
    expect(parts.map((p) => [p.kind, p.payableOn])).toEqual([["advance", "acceptance"], ["balance", "delivery"]]);
    expect(parts[0].amountCents + parts[1].amountCents).toBe(99999);
  });
  it("labels plans in plain words", () => {
    expect(planLabel({ paymentPlan: "split", advancePct: 50 })).toBe("50% on acceptance, 50% on delivery");
  });
});

describe("allowedActions", () => {
  it("only the side the open version awaits can accept or decline; the proposer can withdraw", () => {
    expect(allowedActions({ role: "brand", status: "proposed", openBy: "creator", anyPaid: false })).toMatchObject({ accept: true, decline: true, propose: true, withdraw: false });
    expect(allowedActions({ role: "creator", status: "proposed", openBy: "creator", anyPaid: false })).toMatchObject({ accept: false, decline: false, propose: false, withdraw: true });
  });
  it("accepted terms can be revised (by either side) until money moves, then they're fixed", () => {
    expect(allowedActions({ role: "brand", status: "accepted", openBy: null, anyPaid: false })).toMatchObject({ propose: true, cancel: true });
    expect(allowedActions({ role: "brand", status: "accepted", openBy: null, anyPaid: true })).toMatchObject({ propose: false, cancel: false });
  });
  it("only the creator marks delivered, and only once agreed", () => {
    expect(allowedActions({ role: "creator", status: "accepted", openBy: null, anyPaid: false }).markDelivered).toBe(true);
    expect(allowedActions({ role: "brand", status: "accepted", openBy: null, anyPaid: false }).markDelivered).toBe(false);
    expect(allowedActions({ role: "creator", status: "proposed", openBy: "brand", anyPaid: false }).markDelivered).toBe(false);
  });
  it("finished deals allow nothing but paying what's due", () => {
    for (const status of ["completed", "declined", "cancelled"] as const) {
      expect(allowedActions({ role: "creator", status, openBy: null, anyPaid: false })).toMatchObject({ accept: false, propose: false, cancel: false, markDelivered: false });
    }
  });
});
