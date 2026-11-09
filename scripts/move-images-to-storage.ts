/**
 * Move images stored as base64 data URLs in the database (avatars, brand logos, product
 * covers) into Supabase Storage, replacing each with its public URL (lib/media-storage).
 *
 * Idempotent: only rows still holding a `data:` URL are touched, and uploads are
 * content-addressed, so re-running after a partial run is safe. Creates the public bucket if
 * it doesn't exist. A row whose image is unreadable is reported and left as it is.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... npx tsx scripts/move-images-to-storage.ts --dry-run
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... npx tsx scripts/move-images-to-storage.ts
 */

import { prisma } from "@/lib/prisma";
import { ensureBucket, parseDataUrl, storageConfig, storeImage, type MediaKind } from "@/lib/media-storage";

const DRY_RUN = process.argv.includes("--dry-run");
const DATA = { startsWith: "data:" };

type Job = { label: string; kind: MediaKind; rows: () => Promise<Array<{ id: string; value: string }>>; save: (id: string, url: string) => Promise<unknown> };

const jobs: Job[] = [
  {
    label: "Avatars (User.avatarUrl)",
    kind: "avatars",
    rows: async () => (await prisma.user.findMany({ where: { avatarUrl: DATA }, select: { id: true, avatarUrl: true } })).map((r) => ({ id: r.id, value: r.avatarUrl! })),
    save: (id, url) => prisma.user.update({ where: { id }, data: { avatarUrl: url } }),
  },
  {
    label: "Brand logos (BrandProfile.logoUrl)",
    kind: "logos",
    rows: async () => (await prisma.brandProfile.findMany({ where: { logoUrl: DATA }, select: { id: true, logoUrl: true } })).map((r) => ({ id: r.id, value: r.logoUrl! })),
    save: (id, url) => prisma.brandProfile.update({ where: { id }, data: { logoUrl: url } }),
  },
  {
    label: "Product covers (Product.coverUrl)",
    kind: "covers",
    rows: async () => (await prisma.product.findMany({ where: { coverUrl: DATA }, select: { id: true, coverUrl: true } })).map((r) => ({ id: r.id, value: r.coverUrl! })),
    save: (id, url) => prisma.product.update({ where: { id }, data: { coverUrl: url } }),
  },
];

async function main() {
  const cfg = storageConfig();
  if (!cfg) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set — nowhere to move images to.");
    process.exit(1);
  }
  const dbHost = (process.env.DATABASE_URL ?? "").match(/@([^/:?]+)/)?.[1] ?? "unknown";
  console.log(`${DRY_RUN ? "[dry run] " : ""}Database: ${dbHost} · Storage: ${cfg.url} · bucket "${cfg.bucket}"`);
  if (!DRY_RUN) console.log(`Bucket: ${await ensureBucket()}`);

  let moved = 0, skipped = 0, failed = 0, bytes = 0;
  for (const job of jobs) {
    const rows = await job.rows();
    console.log(`\n${job.label}: ${rows.length} to move`);
    for (const row of rows) {
      if (!parseDataUrl(row.value)) {
        skipped++;
        console.log(`  skip ${row.id}: not a usable image (left as is)`);
        continue;
      }
      bytes += row.value.length;
      if (DRY_RUN) {
        moved++;
        continue;
      }
      try {
        const url = await storeImage(row.value, job.kind);
        await job.save(row.id, url);
        moved++;
      } catch (e) {
        failed++;
        console.error(`  FAILED ${row.id}:`, e instanceof Error ? e.message : e);
      }
    }
  }
  console.log(`\n${DRY_RUN ? "Would move" : "Moved"} ${moved} image(s) (${(bytes / 1024 / 1024).toFixed(1)} MB of row text) · skipped ${skipped} · failed ${failed}`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
