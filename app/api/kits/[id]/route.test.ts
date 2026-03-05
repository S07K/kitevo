import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kit: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

const params = (id: string) => Promise.resolve({ id });

describe("GET /api/kits/[id]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
  });

  it("returns 401 when there is no session", async () => {
    const res = await GET(new Request("http://x"), { params: params("kit-1") });
    expect(res.status).toBe(401);
  });

  it("returns 404 when kit not found or not owner", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.kit.findFirst).mockResolvedValue(null);

    const res = await GET(new Request("http://x"), { params: params("kit-1") });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Kit not found");
  });

  it("returns 200 with kit when owner", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({
      id: "kit-1",
      slug: "my-kit",
      name: "My Kit",
      workSamples: "[]",
      rates: "{}",
      brands: "[]",
      sectionVisibility: "{}",
    } as never);

    const res = await GET(new Request("http://x"), { params: params("kit-1") });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("kit-1");
    expect(json.slug).toBe("my-kit");
    expect(json.name).toBe("My Kit");
  });
});

describe("PUT /api/kits/[id]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
  });

  it("returns 401 when there is no session", async () => {
    const res = await PUT(
      new Request("http://x", { method: "PUT", body: JSON.stringify({}) }),
      { params: params("kit-1") }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when kit not found or not owner", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.kit.findFirst).mockResolvedValue(null);

    const res = await PUT(
      new Request("http://x", { method: "PUT", body: JSON.stringify({ name: "New Name" }) }),
      { params: params("kit-1") }
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated kit when update succeeds", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    const existing = {
      id: "kit-1",
      slug: "my-kit",
      name: "My Kit",
      workSamples: "[]",
      rates: "{}",
      brands: "[]",
      sectionVisibility: "{}",
    };
    vi.mocked(prisma.kit.findFirst).mockResolvedValue(existing as never);
    vi.mocked(prisma.kit.update).mockResolvedValue({
      ...existing,
      name: "Updated Kit",
    } as never);

    const res = await PUT(
      new Request("http://x", { method: "PUT", body: JSON.stringify({ name: "Updated Kit" }) }),
      { params: params("kit-1") }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("Updated Kit");
  });
});

describe("DELETE /api/kits/[id]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
  });

  it("returns 401 when there is no session", async () => {
    const res = await DELETE(new Request("http://x"), { params: params("kit-1") });
    expect(res.status).toBe(401);
  });

  it("returns 404 when kit not found or not owner", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.kit.findFirst).mockResolvedValue(null);

    const res = await DELETE(new Request("http://x"), { params: params("kit-1") });
    expect(res.status).toBe(404);
  });

  it("returns 200 and deletes when owner", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.kit.findFirst).mockResolvedValue({ id: "kit-1" } as never);
    vi.mocked(prisma.kit.delete).mockResolvedValue({} as never);

    const res = await DELETE(new Request("http://x"), { params: params("kit-1") });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(prisma.kit.delete).toHaveBeenCalledWith({ where: { id: "kit-1" } });
  });
});
