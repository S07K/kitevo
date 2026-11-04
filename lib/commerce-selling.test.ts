import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { paymentConnection: { findMany: vi.fn() }, product: { findMany: vi.fn() } } }));
vi.mock("@/lib/creator-plan", () => ({ hasPaidCreatorPlan: vi.fn() }));

const { prisma } = await import("@/lib/prisma");
const { hasPaidCreatorPlan } = await import("@/lib/creator-plan");
const { canSellPaid, canTake, paidPublishProblem, publishedProductsFor } = await import("./commerce");

const accounts = (...providers: string[]) => vi.mocked(prisma.paymentConnection.findMany).mockResolvedValue(providers.map((provider) => ({ provider })) as never);
const paid = (currency = "USD") => ({ status: "published", priceCents: 1950, currency });

describe("selling rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasPaidCreatorPlan).mockResolvedValue(true);
  });

  it("canTake: PayPal can't take INR; Razorpay and Stripe can", () => {
    expect(canTake(["paypal"], "USD")).toBe(true);
    expect(canTake(["paypal"], "INR")).toBe(false);
    expect(canTake(["paypal", "razorpay"], "INR")).toBe(true);
    expect(canTake([], "USD")).toBe(false);
  });

  it("free and draft products never need a plan or an account", async () => {
    expect(await paidPublishProblem("u", { status: "published", priceCents: 0, currency: "USD" })).toBeNull();
    expect(await paidPublishProblem("u", { status: "draft", priceCents: 1950, currency: "USD" })).toBeNull();
    expect(hasPaidCreatorPlan).not.toHaveBeenCalled();
  });

  it("paid publishing needs Starter/Pro", async () => {
    vi.mocked(hasPaidCreatorPlan).mockResolvedValue(false);
    expect(await paidPublishProblem("u", paid())).toMatchObject({ code: "plan_required" });
  });

  it("paid publishing needs a connected account", async () => {
    accounts();
    expect(await paidPublishProblem("u", paid())).toMatchObject({ code: "payments_not_connected" });
  });

  it("an INR product can't be published with only PayPal; USD can", async () => {
    accounts("paypal");
    expect(await paidPublishProblem("u", paid("INR"))).toMatchObject({ code: "currency_unsupported" });
    expect(await paidPublishProblem("u", paid("USD"))).toBeNull();
    accounts("paypal", "stripe");
    expect(await paidPublishProblem("u", paid("INR"))).toBeNull();
  });

  it("canSellPaid follows the plan and the product's currency", async () => {
    accounts("paypal");
    expect(await canSellPaid("u", "USD")).toBe(true);
    expect(await canSellPaid("u", "INR")).toBe(false);
    vi.mocked(hasPaidCreatorPlan).mockResolvedValue(false);
    expect(await canSellPaid("u", "USD")).toBe(false);
  });

  it("the kit only lists paid products someone can actually pay for", async () => {
    const row = (id: string, priceCents: number, currency: string) => ({ id, title: id, description: "", coverUrl: null, priceCents, currency, type: "download" });
    vi.mocked(prisma.product.findMany).mockResolvedValue([row("free", 0, "INR"), row("usd", 1950, "USD"), row("inr", 49900, "INR")] as never);
    accounts("paypal");
    expect((await publishedProductsFor("u")).map((p) => p.id)).toEqual(["free", "usd"]);
    vi.mocked(hasPaidCreatorPlan).mockResolvedValue(false);
    expect((await publishedProductsFor("u")).map((p) => p.id)).toEqual(["free"]);
  });
});
