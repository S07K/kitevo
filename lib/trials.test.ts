import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
const { prisma } = await import("@/lib/prisma");
const { trialDays, getTrialEligibility, cleanDiscountCode } = await import("./trials");

const fresh = { accountType: "creator", emailVerified: true, stripeCustomerId: null, compedTier: null };

describe("trialDays", () => {
  afterEach(() => {
    delete process.env.PRO_TRIAL_DAYS;
  });
  it("defaults to 14, 0 disables, junk disables, caps at 30", () => {
    expect(trialDays()).toBe(14);
    process.env.PRO_TRIAL_DAYS = "0";
    expect(trialDays()).toBe(0);
    process.env.PRO_TRIAL_DAYS = "abc";
    expect(trialDays()).toBe(0);
    process.env.PRO_TRIAL_DAYS = "7";
    expect(trialDays()).toBe(7);
    process.env.PRO_TRIAL_DAYS = "365";
    expect(trialDays()).toBe(30);
  });
});

describe("getTrialEligibility", () => {
  beforeEach(() => vi.mocked(prisma.user.findUnique).mockReset());
  afterEach(() => {
    delete process.env.PRO_TRIAL_DAYS;
  });

  it("allows a verified creator who has never checked out", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fresh as never);
    expect(await getTrialEligibility("u1")).toEqual({ eligible: true, days: 14 });
  });

  it.each([
    ["used", { stripeCustomerId: "cus_1" }],
    ["unverified", { emailVerified: false }],
    ["brand", { accountType: "brand" }],
    ["comped", { compedTier: "pro" }],
  ])("refuses: %s", async (reason, patch) => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...fresh, ...patch } as never);
    expect(await getTrialEligibility("u1")).toMatchObject({ eligible: false, reason });
  });

  it("refuses when trials are off, without touching the database", async () => {
    process.env.PRO_TRIAL_DAYS = "0";
    expect(await getTrialEligibility("u1")).toMatchObject({ eligible: false, reason: "disabled" });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("cleanDiscountCode", () => {
  it("normalises real codes and drops everything else", () => {
    expect(cleanDiscountCode(" launch20 ")).toBe("LAUNCH20");
    expect(cleanDiscountCode("BETA-2026_x")).toBe("BETA-2026_X");
    for (const bad of [undefined, null, 5, "", "a", "<script>", "x y", "A".repeat(41)]) {
      expect(cleanDiscountCode(bad)).toBeUndefined();
    }
  });
});
