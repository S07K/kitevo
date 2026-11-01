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
 * Same code path as /admin (lib/admin-actions setComp): the badge is re-derived from the
 * live subscription + comp, and the change is written to the admin audit log.
 * Needs the payment provider env (PAYMENT_PROVIDER + its API key) for users with a customer id.
 */

import { prisma } from "@/lib/prisma";
import { getTierById } from "@/config/subscriptions";
import { setComp } from "@/lib/admin-actions";

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

  const after = await setComp(user.id, revoke ? null : tierArg, "script:comp-user");

  console.log(
    `${revoke ? `Revoked comp for ${email}` : `Comped ${email} to "${tierArg}"`} (badge: ${after.verifiedTier ?? "none"}).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
