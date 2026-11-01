/**
 * Print the activation → conversion funnel for users who signed up in the last N days.
 *
 *   DATABASE_URL=... npx tsx scripts/funnel-report.ts        # last 30 days
 *   DATABASE_URL=... npx tsx scripts/funnel-report.ts 7      # last 7 days
 *
 * Events are only recorded from the deploy that shipped lib/analytics.ts onward, so
 * cohorts that started before then undercount.
 */

import { prisma } from "@/lib/prisma";
import { getFunnel } from "@/lib/analytics";

async function main() {
  const days = Number(process.argv[2] ?? 30);
  if (!Number.isFinite(days) || days <= 0) throw new Error("Usage: funnel-report.ts [days]");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { rows, canceled } = await getFunnel(since);

  console.log(`\nFunnel — users who signed up in the last ${days} day(s)\n`);
  const width = Math.max(...rows.map((r) => r.label.length));
  for (const r of rows) {
    const pct = r.pctOfSignups == null ? "   —" : `${r.pctOfSignups.toFixed(1).padStart(5)}%`;
    console.log(`  ${r.label.padEnd(width)}  ${String(r.users).padStart(6)}  ${pct}`);
  }
  console.log(`\n  Canceled since signing up: ${canceled}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
