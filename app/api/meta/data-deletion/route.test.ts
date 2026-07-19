import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

const { findMany, update } = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findMany, update } } }));
vi.mock("@/lib/platform-cache", () => ({ invalidatePlatformCache: vi.fn() }));

import { POST } from "./route";

const SECRET = "test-app-secret";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Build a signed_request the way Meta does. */
function sign(payload: object, secret = SECRET): string {
  const encoded = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest();
  return `${b64url(sig)}.${encoded}`;
}

function post(signed_request: string) {
  return POST(
    new Request("https://getkitevo.com/api/meta/data-deletion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ signed_request }),
    })
  );
}

describe("POST /api/meta/data-deletion", () => {
  beforeEach(() => {
    vi.stubEnv("META_APP_SECRET", SECRET);
    findMany.mockReset().mockResolvedValue([{ id: "user_1" }]);
    update.mockReset().mockResolvedValue({});
  });

  it("clears the Instagram connection for a validly signed request", async () => {
    const res = await post(sign({ user_id: "ig_123", algorithm: "HMAC-SHA256", issued_at: 1 }));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { url: string; confirmation_code: string };
    // Meta requires exactly these two fields.
    expect(body.url).toContain("/privacy");
    expect(body.confirmation_code).toMatch(/^[a-f0-9]{16}$/);

    expect(update).toHaveBeenCalledOnce();
    const data = update.mock.calls[0][0].data;
    expect(data.instagramAccessToken).toBeNull();
    expect(data.instagramUserId).toBeNull();
    // Cached aggregates must go too, or the kit keeps showing Meta-derived numbers.
    expect(data.followerCount).toBeNull();
    expect(data.engagementRate).toBeNull();
  });

  // The security boundary: this endpoint is unauthenticated, so the signature is the
  // only thing standing between a stranger and wiping another user's connection.
  it("rejects a request signed with the wrong secret and deletes nothing", async () => {
    const res = await post(sign({ user_id: "ig_123" }, "attacker-secret"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a tampered payload", async () => {
    const valid = sign({ user_id: "ig_123" });
    const [sig] = valid.split(".");
    const swapped = b64url(Buffer.from(JSON.stringify({ user_id: "ig_victim" })));
    const res = await post(`${sig}.${swapped}`);
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a malformed signed_request without throwing", async () => {
    for (const bad of ["", "no-dot", "a.b.c", "!!!.???"]) {
      const res = await post(bad);
      expect(res.status).toBe(400);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("still returns Meta's expected shape when no user matches", async () => {
    findMany.mockResolvedValue([]);
    const res = await post(sign({ user_id: "ig_unknown", issued_at: 2 }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { confirmation_code: string };
    expect(body.confirmation_code).toMatch(/^[a-f0-9]{16}$/);
    expect(update).not.toHaveBeenCalled();
  });

  it("fails closed when META_APP_SECRET is missing", async () => {
    vi.stubEnv("META_APP_SECRET", "");
    const res = await post(sign({ user_id: "ig_123" }));
    expect(res.status).toBe(500);
    expect(update).not.toHaveBeenCalled();
  });
});
