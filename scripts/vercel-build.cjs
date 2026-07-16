/**
 * Vercel build entry: check env, generate client, migrate when DB URL exists, then Next build.
 * Preview deployments often omit DATABASE_URL — migrate deploy would fail immediately.
 */
const { execSync } = require("node:child_process");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

/**
 * Refuse to ship a production build without a real NEXT_PUBLIC_APP_URL.
 *
 * lib/app-url.ts falls back to http://localhost:3000. That is correct in dev and silently
 * wrong in production: the public privacy policy would state the site lives at
 * localhost:3000, and every OAuth redirect URI (Instagram + YouTube connect) would be
 * built pointing there. Nothing throws, so nothing tells you — the deploy just looks fine
 * and the connect buttons don't work.
 *
 * NEXT_PUBLIC_* is inlined at build time, so a value added afterwards needs a redeploy
 * regardless. Failing here costs a build; not failing costs a launch.
 *
 * Preview and local builds only warn: they legitimately run without it, same as DATABASE_URL.
 */
function checkAppUrl() {
  const isProd = process.env.VERCEL_ENV === "production";
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();

  const reject = (problem) => {
    const where = isProd ? "" : " (preview/local build — continuing)";
    const msg = `\n[vercel-build] NEXT_PUBLIC_APP_URL ${problem}${where}\n  See DEPLOY.md step 3.\n`;
    if (!isProd) return void console.log(msg);
    console.error(msg);
    process.exit(1);
  };

  if (!raw) {
    return reject(
      "is not set.\n  Production would publish localhost:3000 as the site URL and point every\n  OAuth redirect there."
    );
  }
  // Redirect URIs are built as `${APP_URL}/api/youtube/callback`; a trailing slash doubles
  // the separator and stops matching what's registered with Google/Meta.
  if (raw.endsWith("/")) {
    return reject(`has a trailing slash (${raw}).\n  Redirect URIs would come out as "…//api/…" and fail to match Google/Meta.`);
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return reject(`is not a valid URL (${raw}).`);
  }
  if (url.protocol !== "https:") {
    return reject(`must be https in production (got ${raw}).`);
  }
  if (/^(localhost$|127\.|0\.0\.0\.0)/.test(url.hostname)) {
    return reject(`points at localhost (${raw}).`);
  }
}

checkAppUrl();

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
