import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("GET /api/instagram/status", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
  });

  it("returns 401 when there is no session", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 200 with connected: false when user has no Instagram", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      instagramUserId: null,
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.connected).toBe(false);
  });

  it("returns 200 with connected: true when user has instagramUserId", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      instagramUserId: "ig-123",
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.connected).toBe(true);
  });
});
