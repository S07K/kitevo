import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Razorpay REST client for CREATOR-OWNED accounts (each call uses that creator's own
 * key id + secret; Kitevo has no Razorpay account of its own). No SDK: four calls over fetch.
 * Docs: https://razorpay.com/docs/api/ (orders, payments, signature verification).
 */

const API = "https://api.razorpay.com/v1";

export type RazorpayKeys = { keyId: string; keySecret: string };

export class RazorpayError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
    this.name = "RazorpayError";
  }
}

/** Key ids look like rzp_live_… or rzp_test_…. */
export function parseKeyId(raw: unknown): { keyId: string; livemode: boolean } | null {
  if (typeof raw !== "string") return null;
  const keyId = raw.trim();
  const m = /^rzp_(live|test)_[A-Za-z0-9]{8,32}$/.exec(keyId);
  return m ? { keyId, livemode: m[1] === "live" } : null;
}

async function call<T>(keys: RazorpayKeys, path: string, init: RequestInit = {}): Promise<T> {
  const auth = Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: { description?: string; code?: string } } & T;
  if (!res.ok) throw new RazorpayError(body.error?.description ?? `Razorpay ${res.status}`, res.status, body.error?.code);
  return body;
}

/** Whether these keys work (a cheap authenticated read). */
export async function verifyKeys(keys: RazorpayKeys): Promise<boolean> {
  try {
    await call(keys, "/orders?count=1");
    return true;
  } catch (e) {
    if (e instanceof RazorpayError && (e.status === 401 || e.status === 403)) return false;
    throw e;
  }
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

/** Create an order on the creator's account. Amount is in the currency's smallest unit. */
export function createOrder(
  keys: RazorpayKeys,
  params: { amount: number; currency: string; receipt: string; notes?: Record<string, string> },
): Promise<RazorpayOrder> {
  return call<RazorpayOrder>(keys, "/orders", { method: "POST", body: JSON.stringify(params) });
}

export type RazorpayPayment = { id: string; order_id: string; amount: number; currency: string; status: string; email?: string };

export function fetchPayment(keys: RazorpayKeys, paymentId: string): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(keys, `/payments/${encodeURIComponent(paymentId)}`);
}

/**
 * Razorpay Checkout's success signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret),
 * hex. Compared in constant time.
 */
export function verifyPaymentSignature(args: { orderId: string; paymentId: string; signature: string; keySecret: string }): boolean {
  if (!args.orderId || !args.paymentId || !/^[a-f0-9]{64}$/i.test(args.signature ?? "")) return false;
  const expected = createHmac("sha256", args.keySecret).update(`${args.orderId}|${args.paymentId}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(args.signature.toLowerCase(), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Capture an authorized payment (when the creator's account doesn't auto-capture). */
export function capturePayment(keys: RazorpayKeys, paymentId: string, amount: number, currency: string): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(keys, `/payments/${encodeURIComponent(paymentId)}/capture`, { method: "POST", body: JSON.stringify({ amount, currency }) });
}

/** All payments attempted against a Razorpay order (to recover a paid order whose confirmation never arrived). */
export async function fetchOrderPayments(keys: RazorpayKeys, orderId: string): Promise<RazorpayPayment[]> {
  const r = await call<{ items?: RazorpayPayment[] }>(keys, `/orders/${encodeURIComponent(orderId)}/payments`);
  return r.items ?? [];
}
