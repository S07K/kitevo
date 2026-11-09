import { createHash } from "node:crypto";

/**
 * Images (avatars, brand logos, product covers) in Supabase Storage instead of base64 data
 * URLs in database rows. Rows then hold a short public URL, and the image is served by the
 * CDN with a one-year immutable cache.
 *
 * - Content-addressed paths (`<kind>/<sha256>.<ext>`): the same bytes upload once, a changed
 *   image gets a new URL (so browsers never show a stale cached one).
 * - Plain fetch against the Storage REST API with the service-role key (server only), like the
 *   other provider clients here; no SDK.
 * - Not configured (no SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY): images stay as data URLs,
 *   exactly as before, so local dev and a missing env never break uploads.
 */

export type MediaKind = "avatars" | "logos" | "covers";

const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const MAX_MEDIA_BYTES = 2 * 1024 * 1024;

export type StorageConfig = { url: string; key: string; bucket: string };

export function storageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig | null {
  const url = env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key, bucket: env.MEDIA_BUCKET?.trim() || "media" };
}

export function publicUrlPrefix(cfg: StorageConfig): string {
  return `${cfg.url}/storage/v1/object/public/${cfg.bucket}/`;
}

/** A URL this app stored (so it may be written back as-is, e.g. a product cover on edit). */
export function isStoredMediaUrl(value: unknown, env: NodeJS.ProcessEnv = process.env): value is string {
  const cfg = storageConfig(env);
  return !!cfg && typeof value === "string" && value.startsWith(publicUrlPrefix(cfg)) && /^[a-z]+\/[a-f0-9]{64}\.(jpg|png|webp|gif)$/.test(value.slice(publicUrlPrefix(cfg).length));
}

export function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const m = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!m || !ALLOWED[m[1]]) return null;
  const bytes = Buffer.from(m[2], "base64");
  return bytes.length > 0 && bytes.length <= MAX_MEDIA_BYTES ? { mime: m[1], bytes } : null;
}

export class MediaError extends Error {}

/**
 * Store an image given as a data URL; returns the public URL to save in the row. Returns the
 * data URL unchanged when storage isn't configured. Throws MediaError for a bad image, or when
 * the upload fails (callers answer 502 rather than silently keeping a huge row).
 */
export async function storeImage(dataUrl: string, kind: MediaKind, fetchImpl: typeof fetch = fetch, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const cfg = storageConfig(env);
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new MediaError("That image can't be used. Choose a JPG, PNG, WebP or GIF under 2MB.");
  if (!cfg) return dataUrl;

  const path = `${kind}/${createHash("sha256").update(parsed.bytes).digest("hex")}.${ALLOWED[parsed.mime]}`;
  let res: Response;
  try {
    res = await fetchImpl(`${cfg.url}/storage/v1/object/${cfg.bucket}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
        "Content-Type": parsed.mime,
        "cache-control": "max-age=31536000",
        // Same bytes → same path: re-uploading is a no-op overwrite, never an error.
        "x-upsert": "true",
      },
      body: new Uint8Array(parsed.bytes),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new MediaError("Couldn't save the image. Try again.");
  }
  if (!res.ok) {
    console.error("[media-storage] upload failed", res.status, await res.text().catch(() => ""));
    throw new MediaError("Couldn't save the image. Try again.");
  }
  return publicUrlPrefix(cfg) + path;
}

/** Create the public bucket if it doesn't exist (backfill script / first deploy). Idempotent. */
export async function ensureBucket(fetchImpl: typeof fetch = fetch, env: NodeJS.ProcessEnv = process.env): Promise<"created" | "exists"> {
  const cfg = storageConfig(env);
  if (!cfg) throw new MediaError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set.");
  const headers = { Authorization: `Bearer ${cfg.key}`, apikey: cfg.key, "Content-Type": "application/json" };
  const got = await fetchImpl(`${cfg.url}/storage/v1/bucket/${cfg.bucket}`, { headers });
  if (got.ok) return "exists";
  const res = await fetchImpl(`${cfg.url}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({ id: cfg.bucket, name: cfg.bucket, public: true, file_size_limit: MAX_MEDIA_BYTES, allowed_mime_types: Object.keys(ALLOWED) }),
  });
  if (!res.ok) throw new MediaError(`Couldn't create bucket "${cfg.bucket}": ${res.status} ${await res.text().catch(() => "")}`);
  return "created";
}

/**
 * Product cover as saved: a new data URL is uploaded; one of our Storage URLs is kept; anything
 * else (another host, a stale shape) becomes `fallback` (the product's current cover on edit).
 */
export async function resolveCover(cover: string | null, fallback: string | null = null): Promise<string | null> {
  if (!cover) return null;
  if (cover.startsWith("data:")) return storeImage(cover, "covers");
  if (isStoredMediaUrl(cover) || cover === fallback) return cover;
  return fallback;
}
