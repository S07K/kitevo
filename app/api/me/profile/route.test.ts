import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("GET /api/me/profile", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
  });

  it("returns 401 when there is no session", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 404 when user is not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("User not found");
  });

  it("returns 200 with profile and onboardingCompletedAt when user exists", async () => {
    const completedAt = new Date("2025-01-15T12:00:00.000Z");
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      name: "Jane",
      username: "jane",
      bio: "Creator",
      avatarUrl: null,
      links: JSON.stringify([{ label: "Site", url: "https://jane.com" }]),
      email: "u@example.com",
      onboardingCompletedAt: completedAt,
      instagramUserId: "178414000",
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.instagramConnected).toBe(true);
    expect(json.name).toBe("Jane");
    expect(json.username).toBe("jane");
    expect(json.bio).toBe("Creator");
    expect(json.links).toEqual([{ label: "Site", url: "https://jane.com" }]);
    expect(json.onboardingCompletedAt).toBe("2025-01-15T12:00:00.000Z");
  });
});

describe("PUT /api/me/profile", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
  });

  it("returns 401 when there is no session", async () => {
    const res = await PUT(new Request("http://x", { method: "PUT", body: JSON.stringify({}) }));
    expect(res.status).toBe(401);
  });

  it("returns 409 when username is already taken", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "other-user" } as never);

    const res = await PUT(
      new Request("http://x", {
        method: "PUT",
        body: JSON.stringify({ username: "taken" }),
      })
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("Username is already taken");
  });

  it("returns 200 and updated profile when update succeeds", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.update).mockResolvedValue({
      name: "Jane Doe",
      username: "jane",
      bio: "Bio",
      avatarUrl: null,
      links: JSON.stringify([{ label: "Link", url: "https://link.com" }]),
    } as never);

    const res = await PUT(
      new Request("http://x", {
        method: "PUT",
        body: JSON.stringify({
          name: "Jane Doe",
          username: "jane",
          bio: "Bio",
          links: [{ label: "Link", url: "https://link.com" }],
        }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("Jane Doe");
    expect(json.username).toBe("jane");
    expect(json.links).toEqual([{ label: "Link", url: "https://link.com" }]);
  });
});
