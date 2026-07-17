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

/**
 * Refuse to ship a production build still using Resend's sandbox sender.
 *
 * lib/email.ts falls back to onboarding@resend.dev. That address only delivers to the
 * Resend account's own verified address, so in production every verification email,
 * password reset, and inquiry notification is silently dropped. Signups would simply never
 * arrive and nothing would log an error.
 */
function checkFromEmail() {
  const isProd = process.env.VERCEL_ENV === "production";
  const raw = (process.env.RESEND_FROM_EMAIL ?? "").trim();

  // Resend takes either a bare address or `Display Name <address>`, and the second form is
  // the one you want — it makes the From line read "Kitevo" instead of a raw address, which
  // is why vitest.setup.ts uses it. So validate the address inside the brackets rather than
  // the whole string: checking `raw` would both reject the good form and let
  // `Kitevo <onboarding@resend.dev>` past the sandbox check, which is the check that matters.
  const address = raw.match(/<([^>]*)>\s*$/)?.[1].trim() ?? raw;

  const problem = !raw
    ? "is not set.\n  Production would send from Resend's sandbox address, which only delivers to\n  your own verified address. Every user email would be silently dropped."
    : /@resend\.dev$/i.test(address)
      ? `is still Resend's sandbox sender (${raw}).\n  It only delivers to your own verified address.`
      : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)
        ? `is not a valid email address (${raw}).`
        : null;

  if (!problem) {
    // Warn (don't fail) when the sender isn't on the app's own domain. Resend only sends
    // from a *verified* domain, so `hello@getkitevo.com` when you verified
    // `mail.getkitevo.com` throws at send time, not here — the same silent-drop this guard
    // exists to prevent. Not fatal: sending from an unrelated domain is a legitimate, if
    // unusual, setup, and this check can't see what you actually verified with Resend.
    const appHost = safeHost(process.env.NEXT_PUBLIC_APP_URL);
    const fromHost = address.split("@")[1]?.toLowerCase();
    if (appHost && fromHost && fromHost !== appHost && !fromHost.endsWith(`.${appHost}`)) {
      console.log(
        `\n[vercel-build] Note: RESEND_FROM_EMAIL (${fromHost}) is not ${appHost} or a\n` +
          `  subdomain of it. Fine if that domain is verified in Resend; every email is\n` +
          `  silently rejected if it isn't.\n`
      );
    }
    return;
  }
  const msg = `\n[vercel-build] RESEND_FROM_EMAIL ${problem}${isProd ? "" : " (preview/local build — continuing)"}\n  See DEPLOY.md step 3.\n`;
  if (!isProd) return void console.log(msg);
  console.error(msg);
  process.exit(1);
}

/** Host of a URL, or null if it isn't parseable. */
function safeHost(url) {
  try {
    return new URL(String(url)).hostname.toLowerCase();
  } catch {
    return null;
  }
}

checkAppUrl();
checkFromEmail();

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
