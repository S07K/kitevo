/**
 * Kit view analytics — record and query views for dashboard.
 */

import { prisma } from "@/lib/prisma";
import { isKitViewTablePresent, markKitViewTablePresent } from "@/lib/kit-view-table";

/** Record a view for a kit (e.g. when public kit page is loaded). Never throws. */
export async function recordKitView(kitId: string, referrer?: string | null): Promise<void> {
  if (!(await isKitViewTablePresent())) return;
  try {
    await prisma.kitView.create({
      data: {
        kitId,
        referrer: referrer ?? undefined,
      },
    });
    markKitViewTablePresent();
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[recordKitView] skipped:", e);
    }
  }
}

/** Get view counts per kit (for dashboard). Returns map of kitId -> count. */
export async function getViewCountsForKits(kitIds: string[]): Promise<Record<string, number>> {
  if (kitIds.length === 0) return {};
  const map: Record<string, number> = {};
  for (const id of kitIds) map[id] = 0;

  if (!(await isKitViewTablePresent())) return map;

  try {
    const result = await prisma.kitView.groupBy({
      by: ["kitId"],
      where: { kitId: { in: kitIds } },
      _count: { id: true },
    });
    for (const row of result) map[row.kitId] = row._count.id;
    markKitViewTablePresent();
  } catch (e) {
    console.error("getViewCountsForKits error:", e);
  }
  return map;
}
