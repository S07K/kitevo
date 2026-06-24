import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kit: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/subscription-for-request", () => ({
  getAllowedKitsForUser: vi.fn(),
}));

vi.mock("@/lib/kit-views", () => ({
  getViewCountsForKits: vi.fn((ids: string[]) => Promise.resolve(Object.fromEntries(ids.map((id: string) => [id, 0])))),
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { getAllowedKitsForUser } = await import("@/lib/subscription-for-request");

describe("GET /api/kits", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
  });

  it("returns 401 when there is no session", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 200 with empty list when user has no kits", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.kit.findMany).mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(0);
  });

  it("returns 200 with kit list when user has kits", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.kit.findMany).mockResolvedValue([
      {
        id: "kit-1",
        slug: "my-kit",
        name: "My Kit",
        workSamples: "[]",
        rates: "{}",
        brands: "[]",
        sectionVisibility: "{}",
      },
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe("kit-1");
    expect(json[0].slug).toBe("my-kit");
    expect(json[0].name).toBe("My Kit");
    expect(json[0].viewCount).toBe(0);
  });
});

describe("POST /api/kits", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(getAllowedKitsForUser).mockResolvedValue(3);
  });

  it("returns 401 when there is no session", async () => {
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ slug: "x", name: "X" }) })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when slug is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });

    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ name: "My Kit" }) })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Slug is required");
  });

  it("returns 403 when user is at kit limit", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(getAllowedKitsForUser).mockResolvedValue(1);
    vi.mocked(prisma.kit.count).mockResolvedValue(1);

    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ slug: "new-kit", name: "New" }),
      })
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Kit limit reached");
  });

  it("returns 409 when slug is already taken", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.kit.count).mockResolvedValue(0);
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({ id: "other" } as never);

    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ slug: "taken", name: "Kit" }),
      })
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("This URL slug is already taken");
  });

  it("returns 201 and kit when create succeeds", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.kit.count).mockResolvedValue(0);
    vi.mocked(prisma.kit.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.kit.create).mockResolvedValue({
      id: "new-kit-id",
      slug: "my-kit",
      name: "My Kit",
      workSamples: "[]",
      rates: "{}",
      brands: "[]",
      sectionVisibility: "{}",
      appearance: "{}",
    } as never);

    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ slug: "my-kit", name: "My Kit" }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("new-kit-id");
    expect(json.slug).toBe("my-kit");
    expect(json.name).toBe("My Kit");
  });
});
