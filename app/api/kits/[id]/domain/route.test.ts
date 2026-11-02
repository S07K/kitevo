import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    kit: { findFirst: vi.fn() },
    customDomain: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/custom-domains", async (orig) => {
  const real = await orig<typeof import("@/lib/custom-domains")>();
  return {
    ...real,
    canUseCustomDomain: vi.fn(),
    vercelConfigured: vi.fn(() => true),
    vercelDomains: { add: vi.fn(), get: vi.fn(), remove: vi.fn() },
    refreshDomain: vi.fn(async () => ({
      domain: { hostname: "kit.alex.com", status: "pending", verified: true, dnsConfigured: false, tlsReady: false, lastError: null, lastCheckedAt: null },
      records: [],
    })),
  };
});

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const cd = await import("@/lib/custom-domains");
const { POST, DELETE } = await import("./route");

const ctx = { params: Promise.resolve({ id: "kit1" }) };
const post = (hostname: string) => POST(new Request("http://x", { method: "POST", body: JSON.stringify({ hostname }) }), ctx);
const DAY = 24 * 60 * 60 * 1000;

describe("POST /api/kits/[id]/domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" }, expires: "" });
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({ id: "kit1", slug: "alex", userId: "u1" } as never);
    vi.mocked(cd.canUseCustomDomain).mockResolvedValue(true);
    vi.mocked(prisma.customDomain.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.customDomain.create).mockResolvedValue({ id: "d1" } as never);
    vi.mocked(cd.vercelDomains.add).mockResolvedValue({ name: "kit.alex.com", verified: true });
  });

  it("only touches the signed-in user's own kit", async () => {
    vi.mocked(prisma.kit.findFirst).mockResolvedValue(null);
    expect((await post("kit.alex.com")).status).toBe(404);
    expect(prisma.kit.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "kit1", userId: "u1" } }));
  });

  it("requires Starter or Pro", async () => {
    vi.mocked(cd.canUseCustomDomain).mockResolvedValue(false);
    const res = await post("kit.alex.com");
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("plan_required");
    expect(cd.vercelDomains.add).not.toHaveBeenCalled();
  });

  it("connects a clean domain: adds it to the host, stores it, returns status", async () => {
    const res = await post("https://Kit.Alex.com/");
    expect(res.status).toBe(201);
    expect(cd.vercelDomains.add).toHaveBeenCalledWith("kit.alex.com");
    expect(prisma.customDomain.create).toHaveBeenCalledWith({ data: { hostname: "kit.alex.com", kitId: "kit1", userId: "u1" } });
  });

  it("rejects bad input before calling anything", async () => {
    expect((await post("kit.getkitevo.com")).status).toBe(400);
    expect(cd.vercelDomains.add).not.toHaveBeenCalled();
  });

  it("won't take a domain someone else claimed recently", async () => {
    vi.mocked(prisma.customDomain.findUnique).mockImplementation((async (a: { where: { kitId?: string } }) =>
      a.where.kitId ? null : { id: "d0", userId: "other", status: "pending", createdAt: new Date(Date.now() - DAY) }) as never);
    expect((await post("kit.alex.com")).status).toBe(409);
    expect(prisma.customDomain.delete).not.toHaveBeenCalled();
  });

  it("frees an abandoned claim (never live, over a week old)", async () => {
    vi.mocked(prisma.customDomain.findUnique).mockImplementation((async (a: { where: { kitId?: string } }) =>
      a.where.kitId ? null : { id: "d0", userId: "other", status: "pending", createdAt: new Date(Date.now() - 8 * DAY) }) as never);
    expect((await post("kit.alex.com")).status).toBe(201);
    expect(prisma.customDomain.delete).toHaveBeenCalledWith({ where: { id: "d0" } });
  });

  it("never frees a live domain, however old", async () => {
    vi.mocked(prisma.customDomain.findUnique).mockImplementation((async (a: { where: { kitId?: string } }) =>
      a.where.kitId ? null : { id: "d0", userId: "other", status: "active", createdAt: new Date(Date.now() - 90 * DAY) }) as never);
    expect((await post("kit.alex.com")).status).toBe(409);
  });

  it("reports a domain that's on another site at the host, and stores nothing", async () => {
    vi.mocked(cd.vercelDomains.add).mockRejectedValue(new cd.DomainProviderError("in use", "domain_already_in_use", 409));
    vi.mocked(cd.vercelDomains.get).mockRejectedValue(new cd.DomainProviderError("nf", "not_found", 404));
    const res = await post("kit.alex.com");
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/already connected to another site/);
    expect(prisma.customDomain.create).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/kits/[id]/domain", () => {
  it("detaches from the host before deleting the row", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" }, expires: "" });
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({ id: "kit1", slug: "alex", userId: "u1" } as never);
    vi.mocked(prisma.customDomain.findUnique).mockResolvedValue({ id: "d1", hostname: "kit.alex.com" } as never);
    const res = await DELETE(new Request("http://x", { method: "DELETE" }), ctx);
    expect(res.status).toBe(200);
    expect(cd.vercelDomains.remove).toHaveBeenCalledWith("kit.alex.com");
    expect(prisma.customDomain.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
  });
});
