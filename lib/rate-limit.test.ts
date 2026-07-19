import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { rateLimit, clientIp, __resetRateLimits } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimits());
  afterEach(() => vi.useRealTimers());

  it("allows up to the limit and blocks the next hit", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", 3, 60_000).ok, `hit ${i + 1} should pass`).toBe(true);
    }
    expect(rateLimit("k", 3, 60_000).ok).toBe(false);
  });

  it("keeps separate counters per key", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", 3, 60_000);
    expect(rateLimit("a", 3, 60_000).ok).toBe(false);
    // A different caller must be unaffected by someone else exhausting their window.
    expect(rateLimit("b", 3, 60_000).ok).toBe(true);
  });

  it("allows again once the window has elapsed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T00:00:00Z"));
    for (let i = 0; i < 3; i++) rateLimit("k", 3, 60_000);
    expect(rateLimit("k", 3, 60_000).ok).toBe(false);

    vi.setSystemTime(new Date("2026-07-19T00:01:01Z"));
    expect(rateLimit("k", 3, 60_000).ok).toBe(true);
  });

  it("reports seconds remaining, for Retry-After", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T00:00:00Z"));
    for (let i = 0; i < 2; i++) rateLimit("k", 2, 60_000);

    vi.setSystemTime(new Date("2026-07-19T00:00:30Z"));
    const res = rateLimit("k", 2, 60_000);
    expect(res.ok).toBe(false);
    expect(res.retryAfterSec).toBe(30);
  });

  it("never reports a retryAfter below 1s, which would suggest retrying immediately", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T00:00:00Z"));
    rateLimit("k", 1, 60_000);
    vi.setSystemTime(new Date("2026-07-19T00:00:59.900Z"));
    expect(rateLimit("k", 1, 60_000).retryAfterSec).toBeGreaterThanOrEqual(1);
  });
});

describe("clientIp", () => {
  const withHeaders = (h: Record<string, string>) =>
    new Request("https://getkitevo.com/x", { method: "POST", headers: h });

  it("takes the first entry of x-forwarded-for (the client, not the proxies)", () => {
    expect(clientIp(withHeaders({ "x-forwarded-for": "203.0.113.9, 70.41.3.18" }))).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(withHeaders({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  // Degrading to one shared bucket is over-restrictive; degrading to no limit is a hole.
  it("returns a constant when no IP header is present, so limiting still applies", () => {
    expect(clientIp(withHeaders({}))).toBe("unknown");
  });
});
