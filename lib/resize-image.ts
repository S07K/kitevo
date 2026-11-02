/**
 * Browser-only: shrink a picked photo to a JPEG data URL small enough for the avatar API
 * (avatars are stored as base64 in the DB, see CLAUDE.md). Used by Settings and the kit editor.
 */

/** Must stay under API limit (see app/api/me/avatar/route.ts) so Neon/pg updates don't time out. */
export const MAX_AVATAR_DATA_URL_CHARS = 180_000;

export async function resizeImageFileToJpegDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let maxSide = 320;
  let quality = 0.82;
  for (let i = 0; i < 12; i++) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_AVATAR_DATA_URL_CHARS) {
      bitmap.close();
      return url;
    }
    quality -= 0.07;
    if (quality < 0.52) {
      quality = 0.78;
      maxSide = Math.max(96, Math.round(maxSide * 0.72));
    }
  }
  bitmap.close();
  throw new Error("Could not compress image enough; try a smaller file.");
}
