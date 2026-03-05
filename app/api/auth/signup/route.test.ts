import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/prisma");

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user-1",
      email: "new@example.com",
      name: "New User",
    } as never);
  });

  it("returns 400 when email or password missing", async () => {
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({}) })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Email and password are required");
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ email: "u@example.com", password: "short" }),
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Password must be at least 8 characters");
  });

  it("returns 409 when email already exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "existing" } as never);

    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ email: "taken@example.com", password: "Password123!" }),
      })
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("An account with this email already exists");
  });

  it("returns 200 and user when signup succeeds", async () => {
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          email: " new@example.com ",
          password: "Password123!",
          name: "New User",
        }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("user-1");
    expect(json.email).toBe("new@example.com");
    expect(json.name).toBe("New User");
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new@example.com",
          name: "New User",
        }),
      })
    );
  });
});
