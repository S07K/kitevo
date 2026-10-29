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

/**
 * Payment provider config. Only checks the provider actually selected, so having stale
 * env for the other one is harmless.
 *
 * The dangerous case is Dodo in test_mode on production: checkout works, the UI looks
 * healthy, and no money is ever taken. That fails silently, which is exactly what these
 * guards exist for.
 */
function checkPaymentProvider() {
  const isProd = process.env.VERCEL_ENV === "production";
  const provider = (process.env.PAYMENT_PROVIDER || "stripe").trim().toLowerCase();

  const fail = (msg) => {
    const text = `\n[vercel-build] ${msg}${isProd ? "" : " (preview/local build — continuing)"}\n  See DEPLOY.md step 3.\n`;
    if (!isProd) return void console.log(text);
    console.error(text);
    process.exit(1);
  };

  if (!["stripe", "dodo"].includes(provider)) {
    return fail(`PAYMENT_PROVIDER is "${provider}". Expected "stripe" or "dodo".`);
  }
  if (provider !== "dodo") return;

  if (!process.env.DODO_API_KEY) return fail("PAYMENT_PROVIDER=dodo but DODO_API_KEY is not set.");
  if (!process.env.DODO_WEBHOOK_SECRET) {
    return fail(
      "PAYMENT_PROVIDER=dodo but DODO_WEBHOOK_SECRET is not set.\n" +
        "  Webhooks would fail verification, so nobody who pays would be granted their plan."
    );
  }
  if (isProd && process.env.DODO_ENVIRONMENT !== "live_mode") {
    return fail(
      `PAYMENT_PROVIDER=dodo but DODO_ENVIRONMENT is "${process.env.DODO_ENVIRONMENT || "unset"}".\n` +
        "  Production would run against Dodo's test environment: checkout appears to work\n" +
        "  and no real payment is ever taken. Set DODO_ENVIRONMENT=live_mode."
    );
  }
}

/**
 * Loud reminder if beta auto-comp is left on in production. Not a failure — running the
 * beta on production is legitimate — but every new signup gets a free comped plan while
 * BETA_AUTO_COMP_TIER is set, so it must not be forgotten after launch.
 */
function checkBetaComp() {
  const tier = process.env.BETA_AUTO_COMP_TIER?.trim();
  if (!tier) return;
  if (process.env.VERCEL_ENV === "production") {
    console.log(
      `\n[vercel-build] Note: BETA_AUTO_COMP_TIER="${tier}" is set on PRODUCTION.\n` +
        "  Every new signup will be granted this tier free. Remove it at launch.\n"
    );
  }
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

checkPaymentProvider();
checkBetaComp();

run("npx prisma generate");

if (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim() !== "") {
  checkDbUrls();
  run("npx prisma db push --accept-data-loss");
} else {
  console.log(
    "\n[vercel-build] DATABASE_URL not set — skipping prisma db push.\n" +
      "  Production: set DATABASE_URL on Vercel so schema sync runs.\n"
  );
}

/**
 * Supabase hands out three connection strings and Prisma needs two specific ones. Getting
 * this wrong fails at runtime or mid-migration with errors that don't name the cause, so
 * check the shape here where we can say what's actually wrong.
 */
function checkDbUrls() {
  const db = (process.env.DATABASE_URL ?? "").trim();
  const direct = (process.env.DIRECT_URL ?? "").trim();

  // prisma/schema.prisma declares directUrl, so `db push` needs it. Without it the push
  // would try to run a transaction through the transaction pooler, which cannot.
  if (!direct) {
    console.error(
      "\n[vercel-build] DIRECT_URL is not set, but prisma/schema.prisma declares directUrl.\n" +
        "  `prisma db push` runs in a transaction and cannot use the transaction pooler.\n" +
        "  Set DIRECT_URL to Supabase's SESSION pooler (:5432 on the pooler host).\n" +
        "  Not the 'direct connection' — that is IPv6-only without the IPv4 add-on.\n" +
        "  See DEPLOY.md step 2.\n"
    );
    process.exit(1);
  }

  // Transaction mode has no prepared statements; Prisma uses them unless told otherwise.
  if (db.includes(":6543") && !/[?&]pgbouncer=true/.test(db)) {
    console.log(
      "\n[vercel-build] Note: DATABASE_URL uses the transaction pooler (:6543) without\n" +
        "  ?pgbouncer=true. Expect prepared-statement errors at runtime.\n"
    );
  }
  if (direct.includes(":6543")) {
    console.log(
      "\n[vercel-build] Note: DIRECT_URL points at :6543 (transaction pooler). Schema\n" +
        "  changes need the session pooler (:5432) and will likely fail here.\n"
    );
  }
}

run("npx next build --webpack");
