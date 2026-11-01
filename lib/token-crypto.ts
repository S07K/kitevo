import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * App-level encryption for third-party OAuth tokens (Instagram / YouTube) at rest.
 *
 * Format: `enc:v1:<keyId>:<iv>:<ciphertext+authTag>` (base64url parts), AES-256-GCM.
 *
 * Keys come from TOKEN_ENCRYPTION_KEYS = "<id>:<base64 32-byte key>[,<id>:<key>...]".
 * The FIRST entry encrypts; every entry can decrypt, so rotation = prepend a new key,
 * run `scripts/encrypt-platform-tokens.ts` to re-encrypt, then drop the old key.
 * Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
 *
 * Rules:
 * - Values without the `enc:` prefix are legacy plaintext and are returned unchanged, so
 *   rows written before encryption keep working until the backfill script runs.
 * - A value that IS encrypted but can't be decrypted (unknown key id, tampering) returns
 *   null — callers treat that as "not connected" (fail closed, never send garbage to Meta).
 * - With no keys configured, encryptToken stores plaintext and warns once. vercel-build
 *   warns loudly when that happens in production.
 */

const PREFIX = "enc:";
const VERSION = "v1";
const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

type Keyring = { activeId: string; keys: Map<string, Buffer> } | null;

let cachedRaw: string | undefined;
let cachedRing: Keyring = null;
let warnedNoKey = false;

export function parseKeyring(raw: string | undefined): Keyring {
  if (!raw || !raw.trim()) return null;
  const keys = new Map<string, Buffer>();
  let activeId: string | null = null;
  for (const entry of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const idx = entry.indexOf(":");
    if (idx <= 0) throw new Error("TOKEN_ENCRYPTION_KEYS entry must be '<id>:<base64 key>'");
    const id = entry.slice(0, idx);
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`TOKEN_ENCRYPTION_KEYS: invalid key id "${id}"`);
    const key = Buffer.from(entry.slice(idx + 1), "base64");
    if (key.length !== 32) throw new Error(`TOKEN_ENCRYPTION_KEYS: key "${id}" must be 32 bytes (base64)`);
    if (keys.has(id)) throw new Error(`TOKEN_ENCRYPTION_KEYS: duplicate key id "${id}"`);
    keys.set(id, key);
    activeId ??= id;
  }
  return activeId ? { activeId, keys } : null;
}

function keyring(): Keyring {
  const raw = process.env.TOKEN_ENCRYPTION_KEYS;
  if (raw !== cachedRaw) {
    cachedRing = parseKeyring(raw);
    cachedRaw = raw;
  }
  return cachedRing;
}

export function isEncryptedToken(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Key id an encrypted value was sealed with, or null for plaintext / malformed values. */
export function tokenKeyId(value: string | null | undefined): string | null {
  if (!isEncryptedToken(value)) return null;
  const parts = value!.split(":");
  return parts.length === 5 ? parts[2] : null;
}

export function activeTokenKeyId(): string | null {
  return keyring()?.activeId ?? null;
}

export function encryptToken(plain: string): string;
export function encryptToken(plain: string | null | undefined): string | null;
export function encryptToken(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return plain ?? null;
  if (isEncryptedToken(plain)) return plain; // never double-encrypt
  const ring = keyring();
  if (!ring) {
    if (!warnedNoKey) {
      warnedNoKey = true;
      console.warn("[token-crypto] TOKEN_ENCRYPTION_KEYS is not set; storing platform tokens in plaintext.");
    }
    return plain;
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, ring.keys.get(ring.activeId)!, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return `${PREFIX}${VERSION}:${ring.activeId}:${iv.toString("base64url")}:${ct.toString("base64url")}`;
}

export function decryptToken(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (!isEncryptedToken(value)) return value; // legacy plaintext
  const parts = value.split(":");
  if (parts.length !== 5 || parts[1] !== VERSION) {
    console.error("[token-crypto] malformed encrypted token");
    return null;
  }
  const [, , keyId, ivPart, ctPart] = parts;
  const key = keyring()?.keys.get(keyId);
  if (!key) {
    console.error(`[token-crypto] no key for id "${keyId}" — is TOKEN_ENCRYPTION_KEYS missing a key?`);
    return null;
  }
  try {
    const iv = Buffer.from(ivPart, "base64url");
    const data = Buffer.from(ctPart, "base64url");
    if (iv.length !== IV_BYTES || data.length < TAG_BYTES) return null;
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(data.subarray(data.length - TAG_BYTES));
    return Buffer.concat([decipher.update(data.subarray(0, data.length - TAG_BYTES)), decipher.final()]).toString("utf8");
  } catch {
    console.error("[token-crypto] token failed authentication (wrong key or tampered)");
    return null;
  }
}

const PLATFORM_TOKEN_FIELDS = ["instagramAccessToken", "youtubeAccessToken", "youtubeRefreshToken"] as const;

/**
 * Decrypt whichever platform-token fields a selected User row carries. Use it at every
 * site that passes a token to Meta/Google:
 *   const user = decryptPlatformTokens(await prisma.user.findUnique({ … }));
 * A token that fails to decrypt becomes null, so existing `if (!user.token)` guards
 * treat it as disconnected.
 */
export function decryptPlatformTokens<T extends Record<string, unknown> | null | undefined>(row: T): T {
  if (!row) return row;
  const out: Record<string, unknown> = { ...row };
  for (const f of PLATFORM_TOKEN_FIELDS) {
    if (f in out && typeof out[f] === "string") out[f] = decryptToken(out[f] as string);
  }
  return out as T;
}
