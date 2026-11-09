/**
 * Repair stored images whose Storage object is gone (e.g. the bucket was deleted after
 * scripts/move-images-to-storage.ts ran).
 *
 * 1. For each missing URL, try a normal GET: the CDN may still hold a cached copy. If it
 *    returns the image, re-upload those exact bytes. Paths are content-addressed
 *    (sha256), so they land at the SAME path and the row's URL works again unchanged; the
 *    script verifies the hash matches before uploading.
 * 2. Reports what it couldn't recover. With --clear, sets those columns to null so the app
 *    shows initials / no cover instead of a broken image (users can re-upload).
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=<prod> DIRECT_URL=<prod> npx tsx scripts/repair-missing-images.ts
 *   ... npx tsx scripts/repair-missing-images.ts --clear     # also null the unrecoverable ones
 */

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureBucket, storageConfig, storeImage, type MediaKind } from "@/lib/media-storage";

const CLEAR = process.argv.includes("--clear");

type Row = { table: "user" | "brandProfile" | "product"; id: string; url: string; kind: MediaKind };

async function exists(url: string) {
  const res = await fetch(url, { method: "HEAD" }).catch(() => null);
  return !!res?.ok;
}

async function main() {
  const cfg = storageConfig();
  if (!cfg) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set.");
  const dbHost = (process.env.DATABASE_URL ?? "").match(/@([^/:?]+)/)?.[1] ?? "unknown";
  // The bucket comes from each row's URL, never MEDIA_BUCKET: a local .env with a dev bucket
  // must not send production images elsewhere (and then --clear their links).
  console.log(`Database: ${dbHost} · Storage: ${cfg.url}${CLEAR ? " · --clear" : ""}`);
  const ready = new Set<string>();

  const stored = { contains: "/storage/v1/object/public/" };
  const rows: Row[] = [
    ...(await prisma.user.findMany({ where: { avatarUrl: stored }, select: { id: true, avatarUrl: true } })).map((r) => ({ table: "user" as const, id: r.id, url: r.avatarUrl!, kind: "avatars" as const })),
    ...(await prisma.brandProfile.findMany({ where: { logoUrl: stored }, select: { id: true, logoUrl: true } })).map((r) => ({ table: "brandProfile" as const, id: r.id, url: r.logoUrl!, kind: "logos" as const })),
    ...(await prisma.product.findMany({ where: { coverUrl: stored }, select: { id: true, coverUrl: true } })).map((r) => ({ table: "product" as const, id: r.id, url: r.coverUrl!, kind: "covers" as const })),
  ];

  let ok = 0, recovered = 0, lost = 0, cleared = 0;
  for (const r of rows) {
    if (await exists(r.url)) {
      ok++;
      continue;
    }
    // A normal GET can still be answered from the CDN cache after the object is gone.
    const res = await fetch(r.url).catch(() => null);
    const type = res?.headers.get("content-type") ?? "";
    if (res?.ok && type.startsWith("image/")) {
      const bytes = Buffer.from(await res.arrayBuffer());
      const expected = r.url.match(/\/([a-f0-9]{64})\.[a-z]+$/)?.[1];
      const actual = createHash("sha256").update(bytes).digest("hex");
      if (expected && expected === actual) {
        const bucket = r.url.split("/storage/v1/object/public/")[1]?.split("/")[0] ?? "media";
        const env = { ...process.env, MEDIA_BUCKET: bucket };
        if (!ready.has(bucket)) {
          await ensureBucket(fetch, env);
          ready.add(bucket);
        }
        const url = await storeImage(`data:${type.split(";")[0]};base64,${bytes.toString("base64")}`, r.kind, fetch, env);
        if (url === r.url && (await exists(url))) {
          recovered++;
          console.log(`  recovered ${r.table} ${r.id}`);
          continue;
        }
      }
    }
    lost++;
    console.log(`  not recoverable: ${r.table} ${r.id}`);
    if (CLEAR) {
      if (r.table === "user") await prisma.user.update({ where: { id: r.id }, data: { avatarUrl: null } });
      if (r.table === "brandProfile") await prisma.brandProfile.update({ where: { id: r.id }, data: { logoUrl: null } });
      if (r.table === "product") await prisma.product.update({ where: { id: r.id }, data: { coverUrl: null } });
      cleared++;
    }
  }
  console.log(`\nStored images: ${rows.length} · fine ${ok} · recovered ${recovered} · not recoverable ${lost}${CLEAR ? ` (cleared ${cleared})` : lost ? " — re-run with --clear to remove the broken links" : ""}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
