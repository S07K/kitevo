import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/token-crypto";
import type { RazorpayKeys } from "@/lib/razorpay";

/**
 * Creators' own payment accounts (creator-owned payments). Secrets are encrypted at rest with
 * lib/token-crypto and only decrypted server-side when calling the provider. Never return the
 * secret (or this module's internal shape) to a client: use publicConnection.
 */

export type ConnectionProvider = "razorpay";

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
  // Show enough of the key id to recognise it, never the secret.
  const k = row.publicKey;
  return { provider: row.provider, keyHint: `${k.slice(0, 9)}…${k.slice(-4)}`, livemode: row.livemode, connectedAt: row.createdAt.toISOString() };
}
