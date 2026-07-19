import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, update, sendPasswordResetEmail } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique, update } } }));
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail,
  RESET_TOKEN_TTL_MS: 60 * 60 * 1000,
}));

import { POST } from "./route";

const TTL = 60 * 60 * 1000;

let ipCounter = 0;
function post(email: string, ip = `10.1.0.${++ipCounter}`) {
  return POST(
    new Request("https://getkitevo.com/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ email }),
    })
  );
}

/** A token issued `ms` ago, expressed the way the DB stores it (as an expiry). */
const issuedAgo = (ms: number) => new Date(Date.now() - ms + TTL);

const account = (over: Record<string, unknown> = {}) => ({
  id: "u1",
  email: "a@b.com",
  passwordHash: "hashed",
  resetPasswordTokenExpiresAt: null,
  ...over,
});

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset().mockResolvedValue({});
    sendPasswordResetEmail.mockReset().mockResolvedValue(undefined);
  });

  it("sends a reset link when none was issued recently", async () => {
    findUnique.mockResolvedValue(account());
    expect((await post("a@b.com")).status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalledOnce();
  });

  it("sends again once the cooldown has passed", async () => {
    findUnique.mockResolvedValue(account({ resetPasswordTokenExpiresAt: issuedAgo(5 * 60_000) }));
    await post("a@b.com");
    expect(sendPasswordResetEmail).toHaveBeenCalledOnce();
  });

  // The point of the change: a loop must not fill an inbox with reset links.
  it("does not send again inside the per-email cooldown", async () => {
    findUnique.mockResolvedValue(account({ resetPasswordTokenExpiresAt: issuedAgo(5_000) }));
    expect((await post("a@b.com")).status).toBe(200);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    // And the live reset link must not be invalidated by a blocked request.
    expect(update).not.toHaveBeenCalled();
  });

  it("looks identical whether cooled down or no such account, so accounts stay unenumerable", async () => {
    findUnique.mockResolvedValue(account({ resetPasswordTokenExpiresAt: issuedAgo(5_000) }));
    const cooled = await post("a@b.com");
    findUnique.mockResolvedValue(null);
    const unknown = await post("nobody@b.com");

    expect(cooled.status).toBe(unknown.status);
    expect(await cooled.json()).toEqual(await unknown.json());
  });

  it("does not send to an OAuth-only account (no password to reset)", async () => {
    findUnique.mockResolvedValue(account({ passwordHash: null }));
    expect((await post("a@b.com")).status).toBe(200);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("rate limits a single IP and returns Retry-After", async () => {
    findUnique.mockResolvedValue(account());
    const ip = "203.0.113.20";
    for (let i = 0; i < 10; i++) await post(`u${i}@b.com`, ip);

    const blocked = await post("another@b.com", ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
