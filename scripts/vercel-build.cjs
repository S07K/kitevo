/**
 * Vercel build entry: check env, generate client, migrate (production only), then Next build.
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

/**
 * Platform-token encryption key (lib/token-crypto.ts). Malformed keys fail the build in any
 * environment: the app would throw on the first Instagram/YouTube call. A missing key only
 * warns — tokens are then stored in plaintext, which is how it worked before encryption —
 * so a deploy never breaks while the key is being set up. Set it, then run
 * scripts/encrypt-platform-tokens.ts to encrypt existing rows.
 */
function checkTokenKeys() {
  const raw = (process.env.TOKEN_ENCRYPTION_KEYS ?? "").trim();
  if (!raw) {
    if (process.env.VERCEL_ENV === "production") {
      console.log(
        "\n[vercel-build] Note: TOKEN_ENCRYPTION_KEYS is not set on PRODUCTION.\n" +
          "  Instagram/YouTube tokens are stored in plaintext. See DEPLOY.md (token encryption).\n"
      );
    }
    return;
  }
  const ids = new Set();
  for (const entry of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const idx = entry.indexOf(":");
    const id = idx > 0 ? entry.slice(0, idx) : "k1"; // bare key = id "k1" (matches lib/token-crypto)
    const key = Buffer.from(idx > 0 ? entry.slice(idx + 1) : entry, "base64");
    if (!/^[A-Za-z0-9_-]+$/.test(id) || key.length !== 32 || ids.has(id)) {
      console.error(
        "\n[vercel-build] TOKEN_ENCRYPTION_KEYS is malformed. Expected a base64 32-byte key, or\n" +
          "  '<id>:<base64 key>' entries separated by commas, unique ids. The first entry is the active key.\n"
      );
      process.exit(1);
    }
    ids.add(id);
  }
}

/**
 * Image storage (lib/media-storage.ts). Without it, uploads still work but are saved as base64
 * inside database rows (the old behaviour), which bloats every page that reads them. Warn only.
 */
function checkMediaStorage() {
  if (process.env.VERCEL_ENV !== "production") return;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  console.log(
    "\n[vercel-build] Note: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set on PRODUCTION.\n" +
      "  New avatars, logos and product covers are stored as base64 in the database.\n" +
      "  Set both (same Supabase project as the media bucket) and redeploy (RELEASE.md).\n"
  );
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
checkTokenKeys();
checkMediaStorage();

run("npx prisma generate");

migrate();

/**
 * Apply pending migrations, on PRODUCTION builds only.
 *
 * Preview deployments share the production DATABASE_URL, so running `migrate deploy` there
 * applied an unmerged branch's migration to the live database the moment the branch was
 * pushed (it happened with 20261105072400_brand_deals). Additive migrations survive that;
 * a drop or rename would hit production before review, and keep applying even if the PR is
 * closed. Production builds (and the GitHub Action on main) are the only writers now.
 *
 * A preview with its OWN database can opt back in with MIGRATE_ON_PREVIEW=1 (set it on the
 * Preview environment only, alongside that database's DATABASE_URL/DIRECT_URL).
 *
 * Consequence: a preview of a branch that adds tables runs against the old schema, so its
 * new pages error until the migration ships. Test schema changes locally (`npm run dev`
 * migrates the local DB).
 */
function migrate() {
  const env = process.env.VERCEL_ENV;
  const hasDb = !!(process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim() !== "");
  if (!hasDb) {
    console.log(
      "\n[vercel-build] DATABASE_URL not set — skipping prisma migrate deploy.\n" +
        "  Production: set DATABASE_URL and DIRECT_URL on Vercel so migrations run.\n"
    );
    return;
  }
  if (env !== "production" && process.env.MIGRATE_ON_PREVIEW !== "1") {
    console.log(
      `\n[vercel-build] ${env || "non-Vercel"} build — skipping prisma migrate deploy.\n` +
        "  Migrations only run on production deploys, so an unmerged branch never changes\n" +
        "  the live database. Set MIGRATE_ON_PREVIEW=1 for a preview with its own database.\n"
    );
    return;
  }
  checkDbUrls();
  // Versioned migrations (prisma/migrations) applied before the build — a pending
  // migration that fails fails the deploy, so new code never ships against an old
  // schema. The GitHub Action (.github/workflows/db-migrate.yml) also runs
  // `migrate deploy` on push to main; whichever gets there first applies it and the
  // other is a no-op. Never use `db push` here again: it accepts data loss and it
  // drifts from migration history.
  run("npx prisma migrate deploy");
}

/**
 * Supabase hands out three connection strings and Prisma needs two specific ones. Getting
 * this wrong fails at runtime or mid-migration with errors that don't name the cause, so
 * check the shape here where we can say what's actually wrong.
 */
function checkDbUrls() {
  const db = (process.env.DATABASE_URL ?? "").trim();
  const direct = (process.env.DIRECT_URL ?? "").trim();

  // prisma/schema.prisma declares directUrl, so every schema-mutating command
  // (`prisma migrate deploy`, and previously `db push`) needs it. Without it the
  // command would try to run a transaction through the transaction pooler, which
  // cannot. Migrations are applied at deploy time (Vercel build + GitHub Action).
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
      "\n[vercel-build] Note: DIRECT_URL points at :6543 (transaction pooler). Migrations\n" +
        "  need the session pooler (:5432) and will likely fail here.\n"
    );
  }
}

run("npx next build --webpack");
