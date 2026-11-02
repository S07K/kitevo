import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { kit: { findFirst: vi.fn() } } }));
vi.mock("@/lib/get-kit-by-slug", () => ({ getKitBySlug: vi.fn() }));
vi.mock("@/lib/kit-view-data", () => ({ loadKitViewData: vi.fn() }));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { getKitBySlug } = await import("@/lib/get-kit-by-slug");
const { loadKitViewData } = await import("@/lib/kit-view-data");
const { GET } = await import("./route");

const params = (id: string) => Promise.resolve({ id });
const session = { user: { id: "user-1", email: "u@x.com" }, expires: "" };

describe("GET /api/kits/[id]/preview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 without a session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    expect((await GET(new Request("http://x"), { params: params("k1") })).status).toBe(401);
  });

  it("404 for someone else's kit (ownership is part of the query)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.kit.findFirst).mockResolvedValue(null);
    const res = await GET(new Request("http://x"), { params: params("k1") });
    expect(res.status).toBe(404);
    expect(vi.mocked(prisma.kit.findFirst).mock.calls[0][0]).toMatchObject({ where: { id: "k1", userId: "user-1" } });
    expect(loadKitViewData).not.toHaveBeenCalled();
  });

  it("returns the creator block plus the shared view data", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({ slug: "maya" } as never);
    vi.mocked(getKitBySlug).mockResolvedValue({
      kit: { id: "k1", userId: "user-1" },
      creator: { name: "Maya", username: "maya", bio: "", niches: ["Beauty"], location: null, links: [{ label: "Site", url: "https://m.co" }] },
    } as never);
    vi.mocked(loadKitViewData).mockResolvedValue({ live: {}, instagramConnected: false, instagramPosts: [], inquiryEnabled: true, referralCode: "abc" });
    const res = await GET(new Request("http://x"), { params: params("k1") });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ kitId: "k1", username: "maya", inquiryEnabled: true, referralCode: "abc", links: [{ label: "Site", url: "https://m.co" }] });
    expect(loadKitViewData).toHaveBeenCalledWith("user-1");
  });
});
