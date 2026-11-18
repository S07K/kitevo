import { prisma } from "@/lib/prisma";
import { hasPaidCreatorPlan, PAID_CREATOR_TIERS } from "@/lib/creator-plan";

/**
 * Custom domains (docs/PLAN.md P0-8): a creator points their own domain at one kit.
 *
 * Hosting: the domain is added to Kitevo's Vercel project through Vercel's REST API, and
 * Vercel issues the TLS certificate once DNS points at it. Ownership is proven by DNS: only
 * the domain's owner can point it at Vercel. Where the domain is already registered to
 * another Vercel account, Vercel additionally asks for a TXT record, which we pass on.
 *
 * Status: "pending" until a check (or the first real visit) sees verified + DNS + HTTPS, then
 * "active". Serving needs the owner on Starter+ at request time; a lapsed plan pauses the
 * domain (redirects to the kit's Kitevo URL) without deleting it.
 */

/** Plans that include a custom domain. */
export const CUSTOM_DOMAIN_TIERS = PAID_CREATOR_TIERS;

/** An unverified claim older than this can be taken over by someone else (anti-squatting). */
export const STALE_PENDING_MS = 7 * 24 * 60 * 60 * 1000;

/** Vercel's documented defaults; the config endpoint's recommendations win when present. */
export const DEFAULT_A_RECORD = "76.76.21.21";
export const DEFAULT_CNAME = "cname.vercel-dns.com";

// ─── Hostname ────────────────────────────────────────────────────────────────

export type HostnameResult = { ok: true; hostname: string } | { ok: false; error: string };

/** Accepts "https://Kit.Example.com/path", returns "kit.example.com" (punycode) or why not. */
export function parseHostname(raw: unknown): HostnameResult {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "Enter a domain, like kit.yourname.com." };
  let input = raw.trim().toLowerCase();
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(input)) input = `http://${input}`;
  let host: string;
  try {
    const url = new URL(input);
    if (url.username || url.password || url.port) return { ok: false, error: "Enter just the domain, without a port or login." };
    host = url.hostname.replace(/\.$/, "");
  } catch {
    return { ok: false, error: "That doesn't look like a domain." };
  }
  if (host.length > 253 || !host.includes(".")) return { ok: false, error: "Enter a full domain, like kit.yourname.com." };
  if (/^\d+(\.\d+){3}$/.test(host) || host.startsWith("[")) return { ok: false, error: "Use a domain name, not an IP address." };
  const labels = host.split(".");
  if (labels.some((l) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l)) || /^\d+$/.test(labels[labels.length - 1])) {
    return { ok: false, error: "That doesn't look like a domain." };
  }
  if (labels[0] === "*") return { ok: false, error: "Wildcard domains aren't supported." };
  const app = appHostname();
  const blocked = ["vercel.app", "vercel.com", "localhost", "getkitevo.com", "kitevo.com", ...(app ? [app] : [])];
  if (blocked.some((b) => host === b || host.endsWith(`.${b}`))) {
    return { ok: false, error: "Use a domain you own." };
  }
  return { ok: true, hostname: host };
}

function appHostname(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "").hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ─── Plan gate ───────────────────────────────────────────────────────────────

/** Whether the user's plan includes custom domains (Starter or Pro; see lib/creator-plan). */
export async function canUseCustomDomain(userId: string): Promise<boolean> {
  return hasPaidCreatorPlan(userId);
}

// ─── Vercel API ──────────────────────────────────────────────────────────────

export class DomainProviderError extends Error {
  constructor(message: string, readonly code?: string, readonly status?: number) {
    super(message);
    this.name = "DomainProviderError";
  }
}

export type VerificationRecord = { type: string; domain: string; value: string; reason?: string };

export function vercelConfigured(): boolean {
  return !!(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

async function vercel<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!vercelConfigured()) throw new DomainProviderError("Custom domains aren't set up on this server yet.", "not_configured");
  const url = new URL(`https://api.vercel.com${path}`);
  if (process.env.VERCEL_TEAM_ID) url.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } } & T;
  if (!res.ok) throw new DomainProviderError(body.error?.message ?? `Vercel API ${res.status}`, body.error?.code, res.status);
  return body;
}

const project = () => encodeURIComponent(process.env.VERCEL_PROJECT_ID ?? "");

type ProjectDomain = { name: string; apexName?: string; verified: boolean; verification?: VerificationRecord[] };
type DomainConfig = {
  misconfigured: boolean;
  recommendedIPv4?: { rank: number; value: string[] }[];
  recommendedCNAME?: { rank: number; value: string }[];
};

export const vercelDomains = {
  add: (name: string) => vercel<ProjectDomain>(`/v10/projects/${project()}/domains`, { method: "POST", body: JSON.stringify({ name }) }),
  get: (name: string) => vercel<ProjectDomain>(`/v9/projects/${project()}/domains/${encodeURIComponent(name)}`),
  verify: (name: string) => vercel<ProjectDomain>(`/v9/projects/${project()}/domains/${encodeURIComponent(name)}/verify`, { method: "POST" }),
  config: (name: string) => vercel<DomainConfig>(`/v6/domains/${encodeURIComponent(name)}/config`),
  remove: async (name: string) => {
    try {
      await vercel(`/v9/projects/${project()}/domains/${encodeURIComponent(name)}`, { method: "DELETE" });
    } catch (e) {
      if (e instanceof DomainProviderError && e.status === 404) return; // already gone
      throw e;
    }
  },
};

/** Vercel error code → a sentence a creator can act on. */
export function providerMessage(e: unknown): string {
  if (e instanceof DomainProviderError) {
    if (e.code === "not_configured") return e.message;
    if (e.code === "domain_already_in_use" || e.code === "domain_taken") return "That domain is already connected to another site. Remove it there first.";
    if (e.code === "invalid_domain") return "That domain isn't valid.";
    if (e.status === 429) return "Too many requests. Try again in a minute.";
  }
  return "Couldn't reach the domain service. Try again in a moment.";
}

// ─── DNS instructions + status ───────────────────────────────────────────────

export type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string; purpose: "point" | "verify" };

/** The records the creator must add, relative to their DNS zone (apex). */
export function dnsRecords(d: { hostname: string; apexName: string | null; verification: VerificationRecord[] }, config?: DomainConfig | null): DnsRecord[] {
  const apex = d.apexName ?? d.hostname.split(".").slice(-2).join(".");
  const rel = (fqdn: string) => (fqdn === apex ? "@" : fqdn.endsWith(`.${apex}`) ? fqdn.slice(0, -apex.length - 1) : fqdn);
  const records: DnsRecord[] = [];
  if (d.hostname === apex) {
    const ip = config?.recommendedIPv4?.sort((a, b) => a.rank - b.rank)[0]?.value[0] ?? DEFAULT_A_RECORD;
    records.push({ type: "A", name: "@", value: ip, purpose: "point" });
  } else {
    const cname = config?.recommendedCNAME?.sort((a, b) => a.rank - b.rank)[0]?.value?.replace(/\.$/, "") ?? DEFAULT_CNAME;
    records.push({ type: "CNAME", name: rel(d.hostname), value: cname, purpose: "point" });
  }
  for (const v of d.verification) {
    if (v.type?.toUpperCase() === "TXT") records.push({ type: "TXT", name: rel(v.domain), value: v.value, purpose: "verify" });
  }
  return records;
}

export function parseVerification(json: string | null | undefined): VerificationRecord[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((r) => r && typeof r.value === "string" && typeof r.domain === "string") : [];
  } catch {
    return [];
  }
}

/** HTTPS answers on the domain (cert issued, DNS live). Any HTTP status counts; only TLS/DNS failures don't. */
async function httpsLive(hostname: string): Promise<boolean> {
  try {
    await fetch(`https://${hostname}/`, { method: "HEAD", redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(6_000) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Re-check a domain with Vercel (ownership, DNS) and over HTTPS, and store the result.
 * Returns the updated row plus the DNS records to show.
 */
export async function refreshDomain(id: string) {
  const row = await prisma.customDomain.findUniqueOrThrow({ where: { id } });
  let { verified, apexName } = row;
  let verification = parseVerification(row.verification);
  let config: DomainConfig | null = null;
  let lastError: string | null = null;
  try {
    let pd = await vercelDomains.get(row.hostname).catch(async (e) => {
      // Not on the project (removed by hand, or the first add failed): add it again.
      if (e instanceof DomainProviderError && e.status === 404) return vercelDomains.add(row.hostname);
      throw e;
    });
    if (!pd.verified) pd = await vercelDomains.verify(row.hostname).catch(() => pd);
    verified = pd.verified;
    apexName = pd.apexName ?? apexName;
    verification = pd.verified ? [] : pd.verification ?? verification;
    config = await vercelDomains.config(row.hostname);
  } catch (e) {
    lastError = providerMessage(e);
  }
  const dnsConfigured = !!config && !config.misconfigured;
  const tlsReady = verified && dnsConfigured ? await httpsLive(row.hostname) : false;
  const active = verified && dnsConfigured && tlsReady;
  const updated = await prisma.customDomain.update({
    where: { id },
    data: {
      verified,
      apexName,
      verification: JSON.stringify(verification),
      dnsConfigured,
      tlsReady,
      lastError,
      lastCheckedAt: new Date(),
      status: active ? "active" : "pending",
      activatedAt: active ? row.activatedAt ?? new Date() : row.activatedAt,
    },
  });
  return { domain: updated, records: dnsRecords({ hostname: updated.hostname, apexName: updated.apexName, verification }, config) };
}

/** The shape the settings UI gets. */
export function publicDomain(d: { hostname: string; status: string; verified: boolean; dnsConfigured: boolean; tlsReady: boolean; lastError: string | null; lastCheckedAt: Date | null }, records: DnsRecord[]) {
  return {
    hostname: d.hostname,
    status: d.status as "pending" | "active",
    verified: d.verified,
    dnsConfigured: d.dnsConfigured,
    tlsReady: d.tlsReady,
    lastError: d.lastError,
    lastCheckedAt: d.lastCheckedAt?.toISOString() ?? null,
    records,
  };
}

/**
 * Detach domains from the Vercel project before their kit/account is deleted (the DB row
 * goes with the cascade). Best effort, in the background: a leftover project domain serves
 * nothing (no row → 404) and is cleaned up on the next claim of that hostname.
 */
export async function releaseDomains(where: { kitId: string } | { userId: string }): Promise<void> {
  if (!vercelConfigured()) return;
  const rows = await prisma.customDomain.findMany({ where, select: { hostname: true } });
  if (rows.length === 0) return;
  const { inBackground } = await import("@/lib/background");
  inBackground("release-custom-domains", () => Promise.all(rows.map((r) => vercelDomains.remove(r.hostname))));
}
