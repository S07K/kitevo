/**
 * Minimal Stripe REST client for CREATOR-OWNED accounts: each call uses that creator's own
 * restricted key (rk_…), never Kitevo's. Kitevo's own billing goes through lib/payments
 * (stripe-provider.ts is the only file that imports the `stripe` SDK); this file uses fetch.
 * The key only needs "Checkout Sessions: Write". Docs: https://docs.stripe.com/api/checkout/sessions
 */

const API = "https://api.stripe.com/v1";

export class StripeCreatorError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
    this.name = "StripeCreatorError";
  }
}

/** Restricted keys only (rk_live_… / rk_test_…): a full secret key would give Kitevo far more than it needs. */
export function parseRestrictedKey(raw: unknown): { key: string; livemode: boolean } | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim();
  const m = /^rk_(live|test)_[A-Za-z0-9]{20,255}$/.exec(key);
  return m ? { key, livemode: m[1] === "live" } : null;
}

/** "rk_live_…AbCd": enough to recognise the key, never the key. */
export function keyHint(key: string): string {
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

/** Stripe's form encoding, with nested keys (line_items[0][price_data][currency]=inr). */
export function formEncode(obj: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => out.push(...(typeof item === "object" ? formEncode(item as Record<string, unknown>, `${name}[${i}]`) : [`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`])));
    else if (typeof v === "object") out.push(...formEncode(v as Record<string, unknown>, name));
    else out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

async function call<T>(key: string, path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body ? formEncode(body).join("&") : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } } & T;
  if (!res.ok) throw new StripeCreatorError(json.error?.message ?? `Stripe ${res.status}`, res.status, json.error?.code);
  return json;
}

/** Whether the key works and can see Checkout Sessions (401 = bad key, 403 = missing permission). */
export async function verifyRestrictedKey(key: string): Promise<"ok" | "invalid" | "permission"> {
  try {
    await call(key, "/checkout/sessions?limit=1");
    return "ok";
  } catch (e) {
    if (e instanceof StripeCreatorError && e.status === 401) return "invalid";
    if (e instanceof StripeCreatorError && e.status === 403) return "permission";
    throw e;
  }
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  status: "open" | "complete" | "expired";
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, string> | null;
  payment_intent: string | null;
};

/** A one-off Checkout Session on the creator's account; the price comes from the product. */
export function createCheckoutSession(
  key: string,
  p: { orderId: string; productId: string; title: string; amount: number; currency: string; email: string; successUrl: string; cancelUrl: string },
): Promise<CheckoutSession> {
  return call<CheckoutSession>(key, "/checkout/sessions", {
    mode: "payment",
    customer_email: p.email,
    client_reference_id: p.orderId,
    success_url: p.successUrl,
    cancel_url: p.cancelUrl,
    line_items: [{ quantity: 1, price_data: { currency: p.currency.toLowerCase(), unit_amount: p.amount, product_data: { name: p.title.slice(0, 250) } } }],
    metadata: { kitevo_order_id: p.orderId, kitevo_product_id: p.productId },
    payment_intent_data: { metadata: { kitevo_order_id: p.orderId } },
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1h (Stripe minimum is 30 min)
  });
}

export function retrieveCheckoutSession(key: string, sessionId: string): Promise<CheckoutSession> {
  return call<CheckoutSession>(key, `/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

/** Paid, for exactly this order, amount and currency. */
export function sessionPaysFor(s: CheckoutSession, order: { id: string; amountCents: number; currency: string }): boolean {
  return (
    s.payment_status === "paid" &&
    s.metadata?.kitevo_order_id === order.id &&
    s.amount_total === order.amountCents &&
    (s.currency ?? "").toLowerCase() === order.currency.toLowerCase()
  );
}
