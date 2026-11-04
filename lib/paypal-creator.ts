/**
 * Minimal PayPal REST client for CREATOR-OWNED accounts (Orders v2). Each call uses the
 * creator's own REST app Client ID + Secret; Kitevo has no PayPal account of its own.
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 *
 * PayPal no longer processes domestic INR payments (PayPal India, 2021), so PayPal is
 * offered for non-INR products only (PAYPAL_CURRENCIES).
 */

export type PayPalEnv = "live" | "sandbox";
export type PayPalCreds = { clientId: string; secret: string; env: PayPalEnv };

export const PAYPAL_CURRENCIES = ["USD"] as const;
export const paypalSupports = (currency: string) => (PAYPAL_CURRENCIES as readonly string[]).includes(currency.toUpperCase());

const API: Record<PayPalEnv, string> = { live: "https://api-m.paypal.com", sandbox: "https://api-m.sandbox.paypal.com" };

export class PayPalError extends Error {
  constructor(message: string, readonly status?: number, readonly issue?: string) {
    super(message);
    this.name = "PayPalError";
  }
}

/** Client IDs and secrets are long base64url-ish strings. */
export function parsePayPalCreds(rawId: unknown, rawSecret: unknown): { clientId: string; secret: string } | null {
  const clientId = typeof rawId === "string" ? rawId.trim() : "";
  const secret = typeof rawSecret === "string" ? rawSecret.trim() : "";
  const ok = (s: string) => /^[A-Za-z0-9_-]{40,128}$/.test(s);
  return ok(clientId) && ok(secret) ? { clientId, secret } : null;
}

/** "19.50" from 1950 minor units (PayPal wants a decimal string). */
export function toPayPalAmount(minor: number): string {
  return (minor / 100).toFixed(2);
}

async function token(c: { clientId: string; secret: string }, env: PayPalEnv): Promise<string> {
  const res = await fetch(`${API[env]}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${c.clientId}:${c.secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new PayPalError(json.error_description ?? `PayPal auth ${res.status}`, res.status);
  return json.access_token;
}

/** Which environment these credentials belong to (live first), or null if neither accepts them. */
export async function detectPayPalEnv(c: { clientId: string; secret: string }): Promise<PayPalEnv | null> {
  for (const env of ["live", "sandbox"] as const) {
    try {
      await token(c, env);
      return env;
    } catch (e) {
      if (!(e instanceof PayPalError) || (e.status !== 401 && e.status !== 400)) throw e;
    }
  }
  return null;
}

async function call<T>(c: PayPalCreds, path: string, init: { method?: string; body?: unknown; requestId?: string } = {}): Promise<T> {
  const res = await fetch(`${API[c.env]}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${await token(c, c.env)}`,
      "Content-Type": "application/json",
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as { message?: string; details?: { issue?: string }[] } & T;
  if (!res.ok) throw new PayPalError(json.message ?? `PayPal ${res.status}`, res.status, json.details?.[0]?.issue);
  return json;
}

export type PayPalCapture = { id: string; status: string; amount: { currency_code: string; value: string }; custom_id?: string };
export type PayPalOrder = {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  links?: { href: string; rel: string }[];
  purchase_units?: { custom_id?: string; reference_id?: string; amount?: { currency_code: string; value: string }; payments?: { captures?: PayPalCapture[] } }[];
};

/** Create an order on the creator's account; the buyer approves it on PayPal (payer-action link). */
export function createPayPalOrder(
  c: PayPalCreds,
  p: { orderId: string; title: string; amount: number; currency: string; returnUrl: string; cancelUrl: string; brandName: string },
): Promise<PayPalOrder> {
  return call<PayPalOrder>(c, "/v2/checkout/orders", {
    method: "POST",
    requestId: `kitevo-create-${p.orderId}`, // idempotent create
    body: {
      intent: "CAPTURE",
      purchase_units: [
        { reference_id: p.orderId, custom_id: p.orderId, description: p.title.slice(0, 127), amount: { currency_code: p.currency.toUpperCase(), value: toPayPalAmount(p.amount) } },
      ],
      payment_source: {
        paypal: {
          experience_context: { brand_name: p.brandName.slice(0, 127), user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING", return_url: p.returnUrl, cancel_url: p.cancelUrl },
        },
      },
    },
  });
}

export const getPayPalOrder = (c: PayPalCreds, id: string) => call<PayPalOrder>(c, `/v2/checkout/orders/${encodeURIComponent(id)}`);

/** Capture an approved order. Idempotent: an already-captured order is fetched and returned. */
export async function capturePayPalOrder(c: PayPalCreds, id: string, orderId: string): Promise<PayPalOrder> {
  try {
    return await call<PayPalOrder>(c, `/v2/checkout/orders/${encodeURIComponent(id)}/capture`, { method: "POST", body: {}, requestId: `kitevo-capture-${orderId}` });
  } catch (e) {
    if (e instanceof PayPalError && e.issue === "ORDER_ALREADY_CAPTURED") return getPayPalOrder(c, id);
    throw e;
  }
}

/** The approval link to send the buyer to. */
export function approvalUrl(o: PayPalOrder): string | null {
  return o.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href ?? null;
}

/** Completed, for exactly this order, amount and currency. Returns the capture id or null. */
export function paypalPaysFor(o: PayPalOrder, order: { id: string; amountCents: number; currency: string }): string | null {
  if (o.status !== "COMPLETED") return null;
  const unit = o.purchase_units?.[0];
  if (!unit || (unit.custom_id ?? unit.reference_id) !== order.id) return null;
  const cap = unit.payments?.captures?.find((x) => x.status === "COMPLETED");
  if (!cap) return null;
  const sameAmount = cap.amount.value === toPayPalAmount(order.amountCents) && cap.amount.currency_code === order.currency.toUpperCase();
  return sameAmount ? cap.id : null;
}
