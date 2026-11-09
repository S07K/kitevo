/**
 * Read-only health check for stored images (lib/media-storage). Counts avatars, brand logos
 * and product covers by kind, and requests every Storage URL to find ones that no longer exist
 * (e.g. after a bucket was deleted). Changes nothing.
 *
 *   DATABASE_URL=<prod> DIRECT_URL=<prod> npx tsx scripts/check-stored-images.ts
 *
 * Prints counts and, for broken links, only the table + row id (no personal data).
 */

import { prisma } from "@/lib/prisma";

type Row = { table: string; id: string; url: string };

async function main() {
  // Which database this is reading (host only, never credentials).
  const host = (process.env.DATABASE_URL ?? "").match(/@([^/:?]+)/)?.[1] ?? "unknown (DATABASE_URL not set)";
  console.log(`Database: ${host}${/localhost|127\.0\.0\.1/.test(host) ? "  ← LOCAL, not production" : ""}`);

  const rows: Row[] = [
    ...(await prisma.user.findMany({ where: { avatarUrl: { not: null } }, select: { id: true, avatarUrl: true } })).map((r) => ({ table: "User.avatarUrl", id: r.id, url: r.avatarUrl! })),
    ...(await prisma.brandProfile.findMany({ where: { logoUrl: { not: null } }, select: { id: true, logoUrl: true } })).map((r) => ({ table: "BrandProfile.logoUrl", id: r.id, url: r.logoUrl! })),
    ...(await prisma.product.findMany({ where: { coverUrl: { not: null } }, select: { id: true, coverUrl: true } })).map((r) => ({ table: "Product.coverUrl", id: r.id, url: r.coverUrl! })),
  ];

  const stored = rows.filter((r) => r.url.includes("/storage/v1/object/public/"));
  const dataUrls = rows.filter((r) => r.url.startsWith("data:"));
  const other = rows.length - stored.length - dataUrls.length;

  const broken: Row[] = [];
  for (const r of stored) {
    const res = await fetch(r.url, { method: "HEAD" }).catch(() => null);
    if (!res?.ok) broken.push(r);
  }
  const buckets = [...new Set(stored.map((r) => r.url.split("/storage/v1/object/public/")[1]?.split("/")[0]))];

  console.log(`Images in the database: ${rows.length}`);
  console.log(`  in Storage (bucket ${buckets.join(", ") || "—"}): ${stored.length}  ·  OK: ${stored.length - broken.length}  ·  MISSING: ${broken.length}`);
  console.log(`  still base64 in the row: ${dataUrls.length}`);
  console.log(`  other links (Google / Instagram / pasted URLs): ${other}`);
  for (const b of broken) console.log(`  missing → ${b.table} ${b.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
