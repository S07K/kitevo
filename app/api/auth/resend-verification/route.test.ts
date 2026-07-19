import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, update, sendVerificationEmail } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique, update } } }));
vi.mock("@/lib/email", async () => ({
  sendVerificationEmail,
  VERIFY_TOKEN_TTL_MS: 24 * 60 * 60 * 1000,
}));

import { POST } from "./route";
import { __resetRateLimits } from "@/lib/rate-limit";

const TTL = 24 * 60 * 60 * 1000;

/** Each call gets a distinct IP so the per-IP limiter never masks what is being tested. */
let ipCounter = 0;
function post(email: string, ip = `10.0.0.${++ipCounter}`) {
  return POST(
    new Request("https://getkitevo.com/api/auth/resend-verification", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ email }),
    })
  );
}

/** A token issued `ms` ago, expressed the way the DB stores it (as an expiry). */
const issuedAgo = (ms: number) => new Date(Date.now() - ms + TTL);

describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => {
    __resetRateLimits();
    findUnique.mockReset();
    update.mockReset().mockResolvedValue({});
    sendVerificationEmail.mockReset().mockResolvedValue(undefined);
  });

  it("sends when no token has been issued before", async () => {
    findUnique.mockResolvedValue({ id: "u1", email: "a@b.com", emailVerified: null, emailVerifyTokenExpiresAt: null });
    expect((await post("a@b.com")).status).toBe(200);
    expect(sendVerificationEmail).toHaveBeenCalledOnce();
  });

  it("sends again once the cooldown has passed", async () => {
    findUnique.mockResolvedValue({
      id: "u1", email: "a@b.com", emailVerified: null,
      emailVerifyTokenExpiresAt: issuedAgo(5 * 60_000),
    });
    await post("a@b.com");
    expect(sendVerificationEmail).toHaveBeenCalledOnce();
  });

  // The point of the whole change: a loop must not be able to fill someone's inbox.
  it("does not send again inside the per-email cooldown", async () => {
    findUnique.mockResolvedValue({
      id: "u1", email: "a@b.com", emailVerified: null,
      emailVerifyTokenExpiresAt: issuedAgo(5_000),
    });
    expect((await post("a@b.com")).status).toBe(200);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    // No new token either: a blocked resend must not invalidate the live link.
    expect(update).not.toHaveBeenCalled();
  });

  it("looks identical whether blocked by cooldown or not, so accounts stay unenumerable", async () => {
    findUnique.mockResolvedValue({
      id: "u1", email: "a@b.com", emailVerified: null,
      emailVerifyTokenExpiresAt: issuedAgo(5_000),
    });
    const cooled = await post("a@b.com");

    findUnique.mockResolvedValue(null); // no such account
    const unknown = await post("nobody@b.com");

    expect(cooled.status).toBe(unknown.status);
    expect(await cooled.json()).toEqual(await unknown.json());
  });

  it("never sends to an already-verified account", async () => {
    findUnique.mockResolvedValue({ id: "u1", email: "a@b.com", emailVerified: new Date() });
    expect((await post("a@b.com")).status).toBe(200);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("rate limits a single IP and returns Retry-After", async () => {
    findUnique.mockResolvedValue({ id: "u1", email: "a@b.com", emailVerified: null, emailVerifyTokenExpiresAt: null });
    const ip = "203.0.113.5";
    for (let i = 0; i < 10; i++) await post(`u${i}@b.com`, ip);

    const blocked = await post("another@b.com", ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("does not let one IP's limit affect another", async () => {
    findUnique.mockResolvedValue({ id: "u1", email: "a@b.com", emailVerified: null, emailVerifyTokenExpiresAt: null });
    for (let i = 0; i < 11; i++) await post(`u${i}@b.com`, "203.0.113.6");
    expect((await post("x@b.com", "203.0.113.7")).status).toBe(200);
  });
});
