import { describe, it, expect, vi, beforeEach } from "vitest";

vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://getkitevo.com");
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock("@/lib/subscription-cache", () => ({ getCachedSubscription: vi.fn() }));
vi.mock("@/config/subscriptions", () => ({
  getTierById: (id: string | null) => (id ? { id } : null),
  getTierByPriceId: (p: string | null) => (p === "price_starter" ? { id: "starter" } : p === "price_brand" ? { id: "brand" } : null),
}));

const { prisma } = await import("@/lib/prisma");
const { getCachedSubscription } = await import("@/lib/subscription-cache");
const { parseHostname, dnsRecords, canUseCustomDomain } = await import("./custom-domains");

describe("parseHostname", () => {
  it("normalises what people paste", () => {
    expect(parseHostname("kit.alexchen.com")).toEqual({ ok: true, hostname: "kit.alexchen.com" });
    expect(parseHostname("  https://Kit.AlexChen.com/path?x=1 ")).toEqual({ ok: true, hostname: "kit.alexchen.com" });
    expect(parseHostname("alexchen.co.uk.")).toEqual({ ok: true, hostname: "alexchen.co.uk" });
    expect(parseHostname("münchen.de")).toEqual({ ok: true, hostname: "xn--mnchen-3ya.de" });
  });
  it.each(["", "localhost", "alexchen", "1.2.3.4", "kit.getkitevo.com", "getkitevo.com", "x.vercel.app", "a..com", "-bad.com", "kit.alex.com:8080", "user@kit.alex.com", "kit.alex.123"])(
    "rejects %j",
    (raw) => expect(parseHostname(raw).ok).toBe(false),
  );
});

describe("dnsRecords", () => {
  it("subdomain → CNAME relative to the zone", () => {
    expect(dnsRecords({ hostname: "kit.alexchen.com", apexName: "alexchen.com", verification: [] })).toEqual([
      { type: "CNAME", name: "kit", value: "cname.vercel-dns.com", purpose: "point" },
    ]);
  });
  it("apex → A record, and Vercel's TXT challenge when it asks for one", () => {
    const r = dnsRecords(
      { hostname: "alexchen.com", apexName: "alexchen.com", verification: [{ type: "TXT", domain: "_vercel.alexchen.com", value: "vc-domain-verify=abc" }] },
      { misconfigured: true, recommendedIPv4: [{ rank: 1, value: ["76.76.21.99"] }] },
    );
    expect(r).toEqual([
      { type: "A", name: "@", value: "76.76.21.99", purpose: "point" },
      { type: "TXT", name: "_vercel", value: "vc-domain-verify=abc", purpose: "verify" },
    ]);
  });
  it("uses Vercel's recommended CNAME when given", () => {
    const r = dnsRecords({ hostname: "media.alex.co.uk", apexName: "alex.co.uk", verification: [] }, { misconfigured: true, recommendedCNAME: [{ rank: 1, value: "abc.vercel-dns-017.com." }] });
    expect(r[0]).toEqual({ type: "CNAME", name: "media", value: "abc.vercel-dns-017.com", purpose: "point" });
  });
});

describe("canUseCustomDomain", () => {
  beforeEach(() => vi.mocked(getCachedSubscription).mockReset());
  const user = (u: object) => vi.mocked(prisma.user.findUnique).mockResolvedValue({ accountType: "creator", compedTier: null, stripeCustomerId: null, ...u } as never);

  it("Starter/Pro via comp or an active subscription", async () => {
    user({ compedTier: "pro" });
    expect(await canUseCustomDomain("u")).toBe(true);
    user({ stripeCustomerId: "cus" });
    vi.mocked(getCachedSubscription).mockResolvedValue({ isActive: true, priceId: "price_starter" } as never);
    expect(await canUseCustomDomain("u")).toBe(true);
  });
  it("not on Free, a lapsed subscription, a brand plan, or a brand account", async () => {
    user({});
    expect(await canUseCustomDomain("u")).toBe(false);
    user({ stripeCustomerId: "cus" });
    vi.mocked(getCachedSubscription).mockResolvedValue({ isActive: false, priceId: "price_starter" } as never);
    expect(await canUseCustomDomain("u")).toBe(false);
    vi.mocked(getCachedSubscription).mockResolvedValue({ isActive: true, priceId: "price_brand" } as never);
    expect(await canUseCustomDomain("u")).toBe(false);
    user({ accountType: "brand", compedTier: "pro" });
    expect(await canUseCustomDomain("u")).toBe(false);
  });
});
