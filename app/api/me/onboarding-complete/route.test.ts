import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { update: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("POST /api/me/onboarding-complete", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
  });

  it("returns 401 when there is no session", async () => {
    const res = await POST();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 200 and sets onboarding completed when session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "u@example.com" },
      expires: "",
    });

    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({ onboardingCompletedAt: expect.any(Date) }),
    });
  });
});
