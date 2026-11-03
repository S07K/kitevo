import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { parseKeyId, verifyPaymentSignature } from "./razorpay";

describe("parseKeyId", () => {
  it("accepts live and test key ids", () => {
    expect(parseKeyId(" rzp_live_ABCdef12345678 ")).toEqual({ keyId: "rzp_live_ABCdef12345678", livemode: true });
    expect(parseKeyId("rzp_test_ABCdef12345678")).toEqual({ keyId: "rzp_test_ABCdef12345678", livemode: false });
  });
  it.each(["", "rzp_live_", "rzp_prod_ABCdef12345678", "sk_live_123", "rzp_test_ab"])("rejects %j", (k) => expect(parseKeyId(k)).toBeNull());
});

describe("verifyPaymentSignature", () => {
  const keySecret = "test_secret_value";
  const sign = (o: string, p: string, s = keySecret) => createHmac("sha256", s).update(`${o}|${p}`).digest("hex");

  it("accepts Razorpay's signature for this order and payment", () => {
    expect(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1"), keySecret })).toBe(true);
  });
  it("rejects a signature for another order, payment or secret, or garbage", () => {
    expect(verifyPaymentSignature({ orderId: "order_2", paymentId: "pay_1", signature: sign("order_1", "pay_1"), keySecret })).toBe(false);
    expect(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_2", signature: sign("order_1", "pay_1"), keySecret })).toBe(false);
    expect(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1", "other"), keySecret })).toBe(false);
    expect(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: "not-hex", keySecret })).toBe(false);
    expect(verifyPaymentSignature({ orderId: "", paymentId: "pay_1", signature: sign("", "pay_1"), keySecret })).toBe(false);
  });
});
