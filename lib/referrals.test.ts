import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    referralCommission: { findFirst: vi.fn(), findUnique: vi.fn(), createMany: vi.fn(), update: vi.fn() },
  },
}));

const { prisma } = await import("@/lib/prisma");
const R = await import("./referrals");

const user = vi.mocked(prisma.user);
const rc = vi.mocked(prisma.referralCommission);

beforeEach(() => vi.resetAllMocks());

describe("emailFingerprint", () => {
  it("folds case, +tags and gmail dots so aliases of one inbox match", () => {
    expect(R.emailFingerprint("Jane.Doe+promo@GMail.com")).toBe("janedoe@gmail.com");
    expect(R.emailFingerprint("jane.doe@googlemail.com")).toBe("janedoe@gmail.com");
    expect(R.emailFingerprint("jane.doe+x@work.co")).toBe("jane.doe@work.co");
  });
});

describe("normalizeReferralCode", () => {
  it("accepts codes and rejects junk", () => {
    expect(R.normalizeReferralCode(" AbC123x ")).toBe("abc123x");
    expect(R.normalizeReferralCode("../etc")).toBeNull();
    expect(R.normalizeReferralCode(42)).toBeNull();
  });
});

describe("attributeReferral", () => {
  it("links a new user to the code's owner", async () => {
    user.findUnique.mockResolvedValue({ id: "ref1", email: "ref@x.com" } as never);
    user.updateMany.mockResolvedValue({ count: 1 } as never);
    await expect(R.attributeReferral({ newUserId: "new1", newUserEmail: "new@y.com", code: "abcd123" })).resolves.toBe(true);
    expect(user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "new1", referredById: null }, data: expect.objectContaining({ referredById: "ref1" }) })
    );
  });

  it("refuses self-referral via an email alias", async () => {
    user.findUnique.mockResolvedValue({ id: "ref1", email: "jane.doe@gmail.com" } as never);
    await expect(R.attributeReferral({ newUserId: "new1", newUserEmail: "janedoe+2@gmail.com", code: "abcd123" })).resolves.toBe(false);
    expect(user.updateMany).not.toHaveBeenCalled();
  });

  it("ignores unknown or missing codes", async () => {
    user.findUnique.mockResolvedValue(null as never);
    await expect(R.attributeReferral({ newUserId: "n", newUserEmail: "n@y.com", code: "zzzz999" })).resolves.toBe(false);
    await expect(R.attributeReferral({ newUserId: "n", newUserEmail: "n@y.com", code: undefined })).resolves.toBe(false);
  });
});

describe("recordCommissionForPayment", () => {
  const now = new Date("2026-11-01T00:00:00Z");
  const pay = { paymentId: "pay_1", customerId: "cus_payer", userId: "payer", amount: 1500, currency: "usd", now };

  it("records 20% of the pre-tax amount with a 30-day hold", async () => {
    user.findUnique
      .mockResolvedValueOnce({ id: "payer", referredById: "ref1", stripeCustomerId: "cus_payer" } as never)
      .mockResolvedValueOnce({ id: "ref1", stripeCustomerId: "cus_ref" } as never);
    rc.findFirst.mockResolvedValue(null as never);
    rc.createMany.mockResolvedValue({ count: 1 } as never);
    await expect(R.recordCommissionForPayment(pay)).resolves.toBe("created");
    const row = rc.createMany.mock.calls[0][0]!.data as Array<Record<string, unknown>>;
    expect(row[0]).toMatchObject({ referrerId: "ref1", referredUserId: "payer", paymentId: "pay_1", baseAmount: 1500, amount: 300, currency: "USD" });
    expect(row[0].availableAt).toEqual(new Date("2026-12-01T00:00:00Z"));
  });

  it("is idempotent on webhook retries", async () => {
    user.findUnique
      .mockResolvedValueOnce({ id: "payer", referredById: "ref1", stripeCustomerId: null } as never)
      .mockResolvedValueOnce({ id: "ref1", stripeCustomerId: null } as never);
    rc.findFirst.mockResolvedValue(null as never);
    rc.createMany.mockResolvedValue({ count: 0 } as never);
    await expect(R.recordCommissionForPayment(pay)).resolves.toBe("duplicate");
  });

  it("stops after the 12-month window", async () => {
    user.findUnique
      .mockResolvedValueOnce({ id: "payer", referredById: "ref1", stripeCustomerId: null } as never)
      .mockResolvedValueOnce({ id: "ref1", stripeCustomerId: null } as never);
    rc.findFirst.mockResolvedValue({ createdAt: new Date("2025-10-01T00:00:00Z") } as never);
    await expect(R.recordCommissionForPayment(pay)).resolves.toBe("window_over");
    expect(rc.createMany).not.toHaveBeenCalled();
  });

  it("refuses when referrer and payer share a payment customer", async () => {
    user.findUnique
      .mockResolvedValueOnce({ id: "payer", referredById: "ref1", stripeCustomerId: "cus_same" } as never)
      .mockResolvedValueOnce({ id: "ref1", stripeCustomerId: "cus_same" } as never);
    await expect(R.recordCommissionForPayment({ ...pay, customerId: "cus_same" })).resolves.toBe("self");
  });

  it("does nothing for users who weren't referred", async () => {
    user.findUnique.mockResolvedValueOnce({ id: "payer", referredById: null, stripeCustomerId: null } as never);
    await expect(R.recordCommissionForPayment(pay)).resolves.toBe("not_referred");
  });
});

describe("applyRefundToCommission", () => {
  const base = { id: "c1", referrerId: "ref1", referredUserId: "payer", paymentId: "pay_1", baseAmount: 1500, amount: 300, currency: "USD" };

  it("reverses an unpaid commission on a full refund", async () => {
    rc.findUnique.mockResolvedValue({ ...base, status: "pending" } as never);
    await expect(R.applyRefundToCommission({ paymentId: "pay_1", refundId: "r1", refundAmount: null })).resolves.toBe("reversed");
    expect(rc.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "reversed" }) }));
  });

  it("shrinks an unpaid commission on a partial refund", async () => {
    rc.findUnique.mockResolvedValue({ ...base, status: "pending" } as never);
    await expect(R.applyRefundToCommission({ paymentId: "pay_1", refundId: "r1", refundAmount: 500 })).resolves.toBe("reduced");
    expect(rc.update).toHaveBeenCalledWith(expect.objectContaining({ data: { baseAmount: 1000, amount: 200 } }));
  });

  it("claws back an already-paid commission with a negative row", async () => {
    rc.findUnique.mockResolvedValue({ ...base, status: "paid" } as never);
    rc.createMany.mockResolvedValue({ count: 1 } as never);
    await expect(R.applyRefundToCommission({ paymentId: "pay_1", refundId: "r1", refundAmount: null })).resolves.toBe("clawback");
    const row = (rc.createMany.mock.calls[0][0]!.data as Array<Record<string, unknown>>)[0];
    expect(row).toMatchObject({ paymentId: "pay_1:refund:r1", amount: -300, baseAmount: -1500 });
  });
});

describe("validatePayoutProfile", () => {
  it("accepts a PayPal profile and uppercases the country", () => {
    const r = R.validatePayoutProfile({ method: "paypal", destination: "me@pp.com", legalName: "Jane Doe", country: "in" });
    expect(r).toEqual({ ok: true, value: { method: "paypal", destination: "me@pp.com", legalName: "Jane Doe", country: "IN", taxId: null } });
  });
  it("rejects a PayPal profile without an email", () => {
    expect(R.validatePayoutProfile({ method: "paypal", destination: "nope", legalName: "Jane", country: "US" }).ok).toBe(false);
  });
  it("rejects unknown methods", () => {
    expect(R.validatePayoutProfile({ method: "venmo", destination: "x", legalName: "Jane", country: "US" }).ok).toBe(false);
  });
});

describe("payoutsCsv", () => {
  const row = (over: Partial<import("./referrals").DueRow> = {}): import("./referrals").DueRow => ({
    referrerId: "ref1",
    name: "Jane",
    email: "jane@x.com",
    currency: "USD",
    amount: 4320,
    commissionCount: 3,
    meetsMinimum: true,
    profile: { method: "paypal", destination: "jane@pp.com", legalName: "Jane Doe", country: "US", taxId: null, updatedAt: "" },
    ...over,
  });

  it("writes PayPal bulk rows for PayPal recipients only", () => {
    const csv = R.payoutsCsv(
      [row(), row({ referrerId: "ref2", profile: { method: "wise", destination: "w@x.com", legalName: "W", country: "GB", taxId: null, updatedAt: "" } })],
      "paypal",
      "Nov 2026"
    );
    expect(csv).toBe('"jane@pp.com","43.20","USD","ref1","Kitevo referral earnings Nov 2026"');
  });

  it("neutralises spreadsheet formulas in user-supplied fields", () => {
    const csv = R.payoutsCsv([row({ profile: { method: "bank", destination: "=HYPERLINK(1)", legalName: "+cmd", country: "US", taxId: null, updatedAt: "" } })], "all", "Nov");
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
    expect(csv).toContain(`"'+cmd"`);
  });
});
