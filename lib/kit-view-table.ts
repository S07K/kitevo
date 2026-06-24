/**
 * Avoid calling Prisma on `KitView` when the table is not migrated yet — prevents
 * noisy `prisma:error` logs and failed queries on every public kit view.
 */

import { prisma } from "@/lib/prisma";

let kitViewExistsCache: boolean | null = null;
let kitViewExistsCacheAt = 0;

/** How long we cache "table missing" before re-checking (e.g. after you run migrate). */
const FALSE_CACHE_MS = 45_000;

export async function isKitViewTablePresent(): Promise<boolean> {
  const now = Date.now();
  if (kitViewExistsCache === true) return true;
  if (kitViewExistsCache === false && now - kitViewExistsCacheAt < FALSE_CACHE_MS) {
    return false;
  }

  try {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'KitView'
      ) AS "exists"
    `;
    const ok = rows[0]?.exists === true;
    kitViewExistsCache = ok;
    kitViewExistsCacheAt = now;
    return ok;
  } catch {
    kitViewExistsCache = false;
    kitViewExistsCacheAt = now;
    return false;
  }
}

/** Call after a successful KitView write so we don’t keep polling when already warm. */
export function markKitViewTablePresent(): void {
  kitViewExistsCache = true;
  kitViewExistsCacheAt = Date.now();
}
