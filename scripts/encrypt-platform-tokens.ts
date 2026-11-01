/**
 * Encrypt existing Instagram/YouTube tokens at rest, and re-encrypt tokens sealed with an
 * old key after a rotation. Also clears the unused Google sign-in tokens on `Account`
 * (we no longer store them — see lib/auth.ts).
 *
 * Idempotent: tokens already sealed with the active key are skipped. Safe to re-run.
 *
 *   TOKEN_ENCRYPTION_KEYS=... DATABASE_URL=... npx tsx scripts/encrypt-platform-tokens.ts --dry-run
 *   TOKEN_ENCRYPTION_KEYS=... DATABASE_URL=... npx tsx scripts/encrypt-platform-tokens.ts
 *
 * Use the SAME TOKEN_ENCRYPTION_KEYS value as production, or the app can't read what this writes.
 */

import { prisma } from "@/lib/prisma";
import { activeTokenKeyId, decryptToken, encryptToken, tokenKeyId } from "@/lib/token-crypto";

const DRY_RUN = process.argv.includes("--dry-run");
const FIELDS = ["instagramAccessToken", "youtubeAccessToken", "youtubeRefreshToken"] as const;
type Field = (typeof FIELDS)[number];

async function main() {
  const active = activeTokenKeyId();
  if (!active) {
    console.error("TOKEN_ENCRYPTION_KEYS is not set — nothing to encrypt with.");
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { OR: FIELDS.map((f) => ({ [f]: { not: null } })) },
    select: { id: true, instagramAccessToken: true, youtubeAccessToken: true, youtubeRefreshToken: true },
  });
  console.log(`${users.length} user(s) with platform tokens. Active key: ${active}.${DRY_RUN ? " [DRY RUN]" : ""}`);

  let updated = 0;
  let unreadable = 0;
  for (const user of users) {
    const data: Partial<Record<Field, string>> = {};
    for (const f of FIELDS) {
      const value = user[f];
      if (!value || tokenKeyId(value) === active) continue;
      const plain = decryptToken(value); // plaintext passes through; old-key values decrypt
      if (plain == null) {
        // Sealed with a key we no longer have. Leave it: the app already treats it as
        // disconnected, and the creator's next reconnect overwrites it.
        unreadable++;
        console.warn(`- ${user.id}.${f}: cannot decrypt (missing old key?) — left as is`);
        continue;
      }
      data[f] = encryptToken(plain);
    }
    if (Object.keys(data).length === 0) continue;
    updated++;
    if (!DRY_RUN) await prisma.user.update({ where: { id: user.id }, data });
  }

  const googleTokens = await prisma.account.count({
    where: { OR: [{ accessToken: { not: null } }, { refreshToken: { not: null } }] },
  });
  if (googleTokens && !DRY_RUN) {
    await prisma.account.updateMany({ data: { accessToken: null, refreshToken: null } });
  }

  console.log(
    `${DRY_RUN ? "Would update" : "Updated"} ${updated} user(s); ${unreadable} unreadable token(s); ` +
      `${DRY_RUN ? "would clear" : "cleared"} Google sign-in tokens on ${googleTokens} account(s).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
