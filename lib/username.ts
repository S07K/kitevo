/**
 * Username rules, shared by the availability check, profile saves and onboarding's
 * suggestion. A username is also the public URL (getkitevo.com/<username>), so it must
 * not collide with an app route.
 */

/** Top-level app routes and system paths a username must never shadow. */
export const RESERVED_USERNAMES = new Set([
  "admin", "api", "app", "compare", "connectors", "d", "deals", "integrations", "custom-domain", "discover", "earn", "feed", "messages", "blog", "brand", "brands", "campaigns", "components", "dashboard",
  "favicon.ico", "forgot-password", "help", "kit", "kits", "login", "logout", "onboarding",
  "pipeline", "p", "o", "products", "inquiries", "pricing", "privacy", "profile", "referral-program", "referrals", "reset-password",
  "robots.txt", "settings", "signup", "sitemap.xml", "social", "support", "terms", "tools", "u",
  "www", "kitevo", "icon.svg",
]);

export const USERNAME_MIN = 2;
export const USERNAME_MAX = 30;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

/** null when valid, otherwise a short human-readable reason. */
export function usernameProblem(username: string): string | null {
  if (!username) return "Enter a username";
  if (!/^[a-z0-9-]+$/.test(username)) return "Only letters, numbers, and hyphens";
  if (username.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters`;
  if (username.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters`;
  if (username.startsWith("-") || username.endsWith("-")) return "Can't start or end with a hyphen";
  if (RESERVED_USERNAMES.has(username)) return "That username is reserved";
  return null;
}

/** Turn a display name or email into a username-shaped base: "Priya Sharma" → "priyasharma". */
export function usernameBase(nameOrEmail: string): string {
  const source = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
  const base = source
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\+.*$/, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, USERNAME_MAX - 4);
  return base.length >= USERNAME_MIN ? base : "creator";
}

/** Candidate usernames in preference order (base, base + short numbers). */
export function usernameCandidates(base: string, count = 6): string[] {
  const out = [base];
  while (out.length < count) out.push(`${base}${Math.floor(10 + Math.random() * 990)}`);
  return [...new Set(out)].filter((c) => !usernameProblem(c));
}
