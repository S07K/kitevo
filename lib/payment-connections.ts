import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/token-crypto";
import type { RazorpayKeys } from "@/lib/razorpay";

/**
 * Creators' own payment accounts (creator-owned payments). Secrets are encrypted at rest with
 * lib/token-crypto and only decrypted server-side when calling the provider. Never return the
 * secret (or this module's internal shape) to a client: use publicConnection.
 */

export const PAYMENT_PROVIDERS = ["razorpay", "stripe", "paypal"] as const;
export type ConnectionProvider = (typeof PAYMENT_PROVIDERS)[number];

/** Which payment accounts a creator has connected (no secrets). */
export async function connectedProviders(userId: string): Promise<ConnectionProvider[]> {
  const rows = await prisma.paymentConnection.findMany({ where: { userId, provider: { in: [...PAYMENT_PROVIDERS] } }, select: { provider: true } });
  return PAYMENT_PROVIDERS.filter((p) => rows.some((r) => r.provider === p));
}

/** Stripe: the restricted key is the secret; publicKey stores only its hint (rk_live_…AbCd). */
export async function saveStripeConnection(userId: string, key: string, hint: string, livemode: boolean) {
  const data = { publicKey: hint, secretEncrypted: encryptToken(key), livemode };
  return prisma.paymentConnection.upsert({
    where: { userId_provider: { userId, provider: "stripe" } },
    create: { userId, provider: "stripe", ...data },
    update: data,
  });
}

/** PayPal: Client ID is public-ish (stored plain); the Secret is encrypted; env from detection. */
export async function savePayPalConnection(userId: string, clientId: string, secret: string, env: "live" | "sandbox") {
  const data = { publicKey: clientId, secretEncrypted: encryptToken(secret), livemode: env === "live" };
  return prisma.paymentConnection.upsert({
    where: { userId_provider: { userId, provider: "paypal" } },
    create: { userId, provider: "paypal", ...data },
    update: data,
  });
}

/** The creator's PayPal credentials, decrypted; null if not connected or unreadable. */
export async function paypalCredsFor(userId: string): Promise<{ clientId: string; secret: string; env: "live" | "sandbox" } | null> {
  const row = await prisma.paymentConnection.findUnique({ where: { userId_provider: { userId, provider: "paypal" } } });
  if (!row) return null;
  const secret = decryptToken(row.secretEncrypted);
  return secret ? { clientId: row.publicKey, secret, env: row.livemode ? "live" : "sandbox" } : null;
}

/** The creator's Stripe restricted key, decrypted; null if not connected or unreadable. */
export async function stripeKeyFor(userId: string): Promise<string | null> {
  const row = await prisma.paymentConnection.findUnique({ where: { userId_provider: { userId, provider: "stripe" } } });
  return row ? decryptToken(row.secretEncrypted) : null;
}

export async function saveRazorpayConnection(userId: string, keyId: string, keySecret: string, livemode: boolean) {
  const data = { publicKey: keyId, secretEncrypted: encryptToken(keySecret), livemode };
  return prisma.paymentConnection.upsert({
    where: { userId_provider: { userId, provider: "razorpay" } },
    create: { userId, provider: "razorpay", ...data },
    update: data,
  });
}

/** The creator's Razorpay keys, decrypted; null if not connected or the secret can't be read. */
export async function razorpayKeysFor(userId: string): Promise<RazorpayKeys | null> {
  const row = await prisma.paymentConnection.findUnique({ where: { userId_provider: { userId, provider: "razorpay" } } });
  if (!row) return null;
  const keySecret = decryptToken(row.secretEncrypted);
  return keySecret ? { keyId: row.publicKey, keySecret } : null; // undecryptable → treat as disconnected
}

export function publicConnection(row: { provider: string; publicKey: string; livemode: boolean; createdAt: Date }) {
  // Show enough of the key id to recognise it, never the secret. (Stripe rows already store a hint.)
  const k = row.publicKey;
  const keyHint = row.provider === "stripe" ? k : row.provider === "paypal" ? `${k.slice(0, 6)}…${k.slice(-4)}` : `${k.slice(0, 9)}…${k.slice(-4)}`;
  return { provider: row.provider, keyHint, livemode: row.livemode, connectedAt: row.createdAt.toISOString() };
}
