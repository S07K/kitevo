/**
 * Grant or revoke comped access — a tier's entitlements (kits, verified badge, inquiry
 * inbox) with no subscription. For beta testers, press, and grandfathered early users.
 *
 * A comp is deliberately NOT a fake subscription: it creates no customer id, takes no
 * payment, and survives switching payment providers. Revoking it is one command.
 *
 *   Grant Pro:   npx tsx scripts/comp-user.ts creator@example.com pro
 *   Grant Brand: npx tsx scripts/comp-user.ts brand@example.com brand
 *   Revoke:      npx tsx scripts/comp-user.ts creator@example.com none
 *   List comped: npx tsx scripts/comp-user.ts --list
 *
 * verifiedTier is set alongside so the badge shows immediately; it is kept in sync (and
 * never cleared below the comp) by config/resolveVerifiedTier at every write site.
 */

import { prisma } from "@/lib/prisma";
import { getTierById, getVerifiedTierForTier } from "@/config/subscriptions";

async function list() {
  const users = await prisma.user.findMany({
    where: { compedTier: { not: null } },
    select: { email: true, compedTier: true, verifiedTier: true },
    orderBy: { email: "asc" },
  });
  if (users.length === 0) {
    console.log("No comped users.");
    return;
  }
  console.log(`${users.length} comped user(s):`);
  for (const u of users) console.log(`  ${u.email.padEnd(32)} ${u.compedTier}  (badge: ${u.verifiedTier ?? "none"})`);
}

async function main() {
  const [arg1, arg2] = process.argv.slice(2);

  if (arg1 === "--list") return list();

  const email = arg1?.trim().toLowerCase();
  const tierArg = arg2?.trim().toLowerCase();
  if (!email || !tierArg) {
    console.error("Usage: comp-user.ts <email> <pro|brand|starter|none>   (or --list)");
    process.exit(1);
  }

  const revoke = tierArg === "none" || tierArg === "null";
  if (!revoke && !getTierById(tierArg)) {
    console.error(`Unknown tier "${tierArg}". Use a tier id (starter|pro|brand) or "none".`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    console.error(`No user with email ${email}.`);
    process.exit(1);
  }

  const compedTier = revoke ? null : tierArg;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      compedTier,
      // Reflect the comp on the badge now. On revoke this drops to null, unless a live
      // subscription later re-grants it via the webhook.
      verifiedTier: getVerifiedTierForTier(compedTier),
    },
  });

  console.log(revoke ? `Revoked comp for ${email}.` : `Comped ${email} to "${compedTier}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
