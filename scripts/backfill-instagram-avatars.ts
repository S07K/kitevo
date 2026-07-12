/**
 * One-off backfill: convert avatars that were stored as expiring Instagram CDN URLs
 * into durable base64 data URLs.
 *
 * Historically /api/me/profile/use-instagram-photo saved the raw signed
 * scontent.*.fbcdn.net URL, which 403s once its signature expires — leaving a broken
 * avatar. This re-fetches a fresh profile-picture URL from the Instagram Graph API
 * (using the user's stored token) and persists the bytes, so the avatar is restored
 * and never changes until the user replaces it.
 *
 * Run (against local dev DB):
 *   DATABASE_URL="postgresql://shubham@localhost:5432/kitevo" npx tsx scripts/backfill-instagram-avatars.ts
 *
 * Pass --dry to preview without writing.
 */

import { prisma } from "@/lib/prisma";
import { getInstagramProfilePictureForUser } from "@/lib/instagram-api";
import { fetchImageAsDataUrl } from "@/lib/image-to-data-url";

const DRY_RUN = process.argv.includes("--dry");

async function main() {
  // Any avatar that isn't a stored data URL is an external link that can expire.
  const users = await prisma.user.findMany({
    where: {
      avatarUrl: { not: null },
      NOT: { avatarUrl: { startsWith: "data:" } },
    },
    select: { id: true, name: true, avatarUrl: true, instagramUserId: true, instagramAccessToken: true },
  });

  console.log(`Found ${users.length} user(s) with an external (expirable) avatar URL.${DRY_RUN ? " [DRY RUN]" : ""}`);

  let restored = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const label = user.name ?? user.id;

    if (!user.instagramUserId || !user.instagramAccessToken) {
      console.log(`- SKIP ${label}: no connected Instagram token to re-fetch from.`);
      skipped++;
      continue;
    }

    const freshUrl = await getInstagramProfilePictureForUser(user.id);
    if (!freshUrl) {
      console.log(`- SKIP ${label}: Instagram did not return a profile picture (token may be invalid).`);
      skipped++;
      continue;
    }

    try {
      const dataUrl = await fetchImageAsDataUrl(freshUrl);
      if (DRY_RUN) {
        console.log(`- WOULD RESTORE ${label}: ${dataUrl.length} chars of base64.`);
      } else {
        await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: dataUrl } });
        console.log(`- RESTORED ${label}: stored ${dataUrl.length} chars of base64.`);
      }
      restored++;
    } catch (e) {
      console.log(`- FAIL ${label}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  console.log(`\nDone. restored=${restored} skipped=${skipped} failed=${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
