/**
 * Refresh the cached follower/engagement stats for all connected creators.
 * Populates User.followerCount / engagementRate / statsUpdatedAt so the brand
 * discover page can filter by audience size and engagement.
 *
 * Run periodically (e.g. daily cron):
 *   DATABASE_URL="postgresql://shubham@localhost:5432/kitevo" npx tsx scripts/refresh-creator-stats.ts
 */

import { prisma } from "@/lib/prisma";
import { refreshCreatorStatsCache } from "@/lib/creator-stats-cache";

async function main() {
  const creators = await prisma.user.findMany({
    where: {
      accountType: "creator",
      OR: [
        { instagramAccessToken: { not: null } },
        { youtubeAccessToken: { not: null } },
      ],
    },
    select: { id: true, name: true, username: true },
  });

  console.log(`Refreshing stats for ${creators.length} connected creator(s)...`);

  let ok = 0;
  for (const c of creators) {
    await refreshCreatorStatsCache(c.id);
    const after = await prisma.user.findUnique({
      where: { id: c.id },
      select: { followerCount: true, engagementRate: true },
    });
    console.log(`- ${c.username ?? c.name ?? c.id}: followers=${after?.followerCount ?? "?"} engagement=${after?.engagementRate ?? "?"}`);
    ok++;
  }

  console.log(`\nDone. Refreshed ${ok} creator(s).`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
