/**
 * Fetch a remote image and return it as a base64 data URL so it can be stored
 * durably in the DB. Used to persist avatars/logos that would otherwise point at
 * expiring/signed URLs (e.g. Instagram's scontent.*.fbcdn.net links, which 403
 * once their signature lapses). Storing the bytes means the image never changes
 * or breaks until the user replaces it.
 */

/** ~200k chars ≈ ~150KB binary — plenty for a profile thumb, and keeps large TEXT
 *  updates under Neon pooler timeouts (P1017). Shared with /api/me/avatar. */
export const AVATAR_MAX_DATA_URL_LENGTH = 200_000;

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * Download `url` and encode it as a `data:<mime>;base64,...` string.
 * Throws if the request fails, the type isn't an allowed image, or it exceeds
 * `maxLength`.
 */
export async function fetchImageAsDataUrl(
  url: string,
  maxLength: number = AVATAR_MAX_DATA_URL_LENGTH
): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);

  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_MIME.includes(mime)) {
    throw new Error(`Unexpected image type: ${mime || "unknown"}`);
  }

  const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;
  if (dataUrl.length > maxLength) {
    throw new Error("Image too large to store");
  }
  return dataUrl;
}
