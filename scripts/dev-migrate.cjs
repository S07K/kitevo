/**
 * Runs before `npm run dev` (the "predev" script): applies pending Prisma migrations and
 * regenerates the client, so switching to a branch with a new migration just works.
 *
 * Only ever touches a database on this machine. If .env points anywhere else (e.g. it was
 * pointed at production to run a one-off script), it skips with a warning instead of
 * applying unmerged migrations to a shared database. Production migrates on deploy.
 */
const { execSync } = require("node:child_process");

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
let host = "";
try {
  host = new URL(url).hostname;
} catch {
  /* missing or unparsable */
}

if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
  console.warn(
    `\n[dev-migrate] Skipped: the database in .env is ${host ? `on "${host}"` : "not set"}, not this machine.\n` +
      "             Migrations only auto-apply to a local database. Point DATABASE_URL/DIRECT_URL at your local Postgres.\n",
  );
  process.exit(0);
}

try {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  execSync("npx prisma generate", { stdio: "ignore" });
} catch {
  console.error("\n[dev-migrate] Migrations failed (see above). Starting the dev server anyway.\n");
}
