import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kit: {
      findFirst: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/prisma");

const params = (slug: string) => Promise.resolve({ slug });

describe("GET /api/kits/by-slug/[slug]", () => {
  beforeEach(() => {
    vi.mocked(prisma.kit.findFirst).mockResolvedValue(null);
  });

  it("returns 404 when slug not found", async () => {
    const res = await GET(new Request("http://x"), { params: params("missing-kit") });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Kit not found");
  });

  it("returns 200 with kit and creator when slug exists", async () => {
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({
      id: "kit-1",
      slug: "my-kit",
      name: "My Kit",
      workSamples: "[]",
      rates: "{}",
      brands: "[]",
      sectionVisibility: "{}",
      appearance: "{}",
      manualStats: '{"instagramFollowers":12400,"instagramEngagement":4.2,"garbage":-3}',
      user: {
        name: "Jane",
        username: "jane",
        bio: "Creator bio",
        avatarUrl: null,
        links: JSON.stringify([{ label: "Site", url: "https://jane.com" }]),
        email: "jane@example.com",
      },
    } as never);

    const res = await GET(new Request("http://x"), { params: params("my-kit") });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.kit).toBeDefined();
    expect(json.kit.id).toBe("kit-1");
    expect(json.kit.slug).toBe("my-kit");
    expect(json.kit.manualStats).toEqual({
      instagramFollowers: 12400,
      instagramEngagement: 4.2,
    });
    expect(json.creator).toBeDefined();
    expect(json.creator.name).toBe("Jane");
    expect(json.creator.username).toBe("jane");
    expect(json.creator.links).toEqual([{ label: "Site", url: "https://jane.com" }]);
  });
});
