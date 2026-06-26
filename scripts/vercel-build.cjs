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
  run("npx prisma db push --accept-data-loss");
} else {
  console.log(
    "\n[vercel-build] DATABASE_URL not set — skipping prisma db push.\n" +
      "  Production: set DATABASE_URL on Vercel so schema sync runs.\n"
  );
}

run("npx next build");
