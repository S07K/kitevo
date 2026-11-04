import { describe, it, expect } from "vitest";
import { formEncode, keyHint, parseRestrictedKey, sessionPaysFor, type CheckoutSession } from "./stripe-creator";

describe("parseRestrictedKey", () => {
  const k = "rk_live_" + "A".repeat(30);
  it("accepts restricted keys and reads the mode", () => {
    expect(parseRestrictedKey(` ${k} `)).toEqual({ key: k, livemode: true });
    expect(parseRestrictedKey("rk_test_" + "b".repeat(30))?.livemode).toBe(false);
  });
  it.each(["sk_live_" + "A".repeat(30), "pk_live_" + "A".repeat(30), "rk_live_short", "", 42])("refuses %j", (v) => expect(parseRestrictedKey(v)).toBeNull());
  it("hints without revealing the key", () => expect(keyHint(k)).toBe("rk_live_…AAAA"));
});

describe("formEncode", () => {
  it("encodes nested objects and arrays the way Stripe expects", () => {
    const s = formEncode({ mode: "payment", line_items: [{ quantity: 1, price_data: { currency: "inr", unit_amount: 49900 } }], metadata: { a: "x y" } }).join("&");
    expect(decodeURIComponent(s)).toBe("mode=payment&line_items[0][quantity]=1&line_items[0][price_data][currency]=inr&line_items[0][price_data][unit_amount]=49900&metadata[a]=x y");
  });
});

describe("sessionPaysFor", () => {
  const order = { id: "ord_1", amountCents: 49900, currency: "INR" };
  const s = (o: Partial<CheckoutSession> = {}): CheckoutSession => ({ id: "cs_1", url: null, status: "complete", payment_status: "paid", amount_total: 49900, currency: "inr", metadata: { kitevo_order_id: "ord_1" }, payment_intent: "pi_1", ...o });
  it("accepts a paid session for this order, amount and currency", () => expect(sessionPaysFor(s(), order)).toBe(true));
  it.each([{ payment_status: "unpaid" as const }, { amount_total: 100 }, { currency: "usd" }, { metadata: { kitevo_order_id: "ord_2" } }, { metadata: null }])("refuses %j", (o) => expect(sessionPaysFor(s(o), order)).toBe(false));
});
