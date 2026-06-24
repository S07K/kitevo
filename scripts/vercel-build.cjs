/**
 * Vercel build entry: generate client, migrate when DB URL exists, then Next build.
 * Preview deployments often omit DATABASE_URL — migrate deploy would fail immediately.
 */
const { execSync } = require("node:child_process");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

run("npx prisma generate");

if (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim() !== "") {
  run("npx prisma migrate deploy");
} else {
  console.log(
    "\n[vercel-build] DATABASE_URL not set — skipping prisma migrate deploy.\n" +
      "  Production: set DATABASE_URL on Vercel (Production) so migrations run.\n" +
      "  Preview with DB: add DATABASE_URL for Preview too (e.g. Neon branch URL).\n"
  );
}

run("npx next build");
