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

/*
  bcrypt runs at cost factor 12 (~240ms of real CPU per call), so the rate-limit tests
  below, which must exceed a 20-request window, would take over 5s and hit vitest's
  default timeout. These tests are about routing and limiting, not hashing, so the hash
  is stubbed. The cost factor itself is exercised in production, not here.
*/
vi.mock("bcryptjs", () => ({ hash: vi.fn().mockResolvedValue("$2a$12$stubbed") }));

// Otherwise every signup constructs the real Resend client and logs a failed send.
vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  VERIFY_TOKEN_TTL_MS: 24 * 60 * 60 * 1000,
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

  // Signup both creates rows and runs bcrypt at cost 12 (~240ms CPU each), so an
  // unthrottled loop is a cheap way to fill the database and saturate the function.
  describe("rate limiting", () => {
    const signup = (email: string, ip: string) =>
      POST(
        new Request("http://x", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": ip },
          body: JSON.stringify({ email, password: "abcd1234", name: "T" }),
        })
      );

    it("blocks a single IP past the limit, with Retry-After", async () => {
      const ip = "203.0.113.40";
      for (let i = 0; i < 20; i++) await signup(`u${i}@example.com`, ip);

      const blocked = await signup("over@example.com", ip);
      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    });

    it("does not let one IP's limit affect another", async () => {
      for (let i = 0; i < 21; i++) await signup(`u${i}@example.com`, "203.0.113.41");
      const other = await signup("fresh@example.com", "203.0.113.42");
      expect(other.status).not.toBe(429);
    });
  });
});
