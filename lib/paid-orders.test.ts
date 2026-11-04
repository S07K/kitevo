import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { order: { findMany: vi.fn(), updateMany: vi.fn() }, user: { findUnique: vi.fn() } } }));
vi.mock("@/lib/app-url", () => ({ APP_URL: "https://getkitevo.com" }));
vi.mock("@/lib/background", () => ({ inBackground: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendDownloadEmail: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/razorpay", () => ({ fetchOrderPayments: vi.fn() }));
vi.mock("@/lib/stripe-creator", async (orig) => ({ ...(await orig<typeof import("@/lib/stripe-creator")>()), retrieveCheckoutSession: vi.fn() }));

const { prisma } = await import("@/lib/prisma");
const { fetchOrderPayments } = await import("@/lib/razorpay");
const { inBackground } = await import("@/lib/background");
const { retrieveCheckoutSession } = await import("@/lib/stripe-creator");
const { recoverPaidOrder } = await import("./paid-orders");

const keys = { keyId: "rzp_test_abcdefgh12", keySecret: "s" };
const pending = { id: "ord_1", provider: "razorpay", sellerId: "u", productId: "p1", buyerEmail: "fan@x.com", accessToken: "tok1", amountCents: 49900, currency: "INR", providerOrderId: "order_RP1", product: { title: "Guide" } };

describe("recoverPaidOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.order.findMany).mockResolvedValue([pending] as never);
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Sana" } as never);
  });

  it("marks a pending order paid when its Razorpay order has a matching captured payment", async () => {
    vi.mocked(fetchOrderPayments).mockResolvedValue([{ id: "pay_9", order_id: "order_RP1", amount: 49900, currency: "INR", status: "captured" }]);
    expect(await recoverPaidOrder({ razorpay: keys }, "p1", "fan@x.com")).toBe("https://getkitevo.com/o/tok1");
    expect(prisma.order.updateMany).toHaveBeenCalledWith({ where: { id: "ord_1", status: "pending" }, data: { status: "paid", providerRef: "pay_9" } });
    expect(inBackground).toHaveBeenCalledTimes(1);
  });

  it("ignores failed, uncaptured or mismatched payments", async () => {
    vi.mocked(fetchOrderPayments).mockResolvedValue([
      { id: "pay_1", order_id: "order_RP1", amount: 49900, currency: "INR", status: "failed" },
      { id: "pay_2", order_id: "order_RP1", amount: 49900, currency: "INR", status: "authorized" },
      { id: "pay_3", order_id: "order_RP1", amount: 100, currency: "INR", status: "captured" },
    ]);
    expect(await recoverPaidOrder({ razorpay: keys }, "p1", "fan@x.com")).toBeNull();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("survives a Razorpay lookup error", async () => {
    vi.mocked(fetchOrderPayments).mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await recoverPaidOrder({ razorpay: keys }, "p1", "fan@x.com")).toBeNull();
  });

  it("recovers a paid Stripe checkout session the same way", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([{ ...pending, provider: "stripe", providerOrderId: "cs_1" }] as never);
    vi.mocked(retrieveCheckoutSession).mockResolvedValue({ id: "cs_1", url: null, status: "complete", payment_status: "paid", amount_total: 49900, currency: "inr", metadata: { kitevo_order_id: "ord_1" }, payment_intent: "pi_7" });
    expect(await recoverPaidOrder({ stripe: "rk_test_x" }, "p1", "fan@x.com")).toBe("https://getkitevo.com/o/tok1");
    expect(prisma.order.updateMany).toHaveBeenCalledWith({ where: { id: "ord_1", status: "pending" }, data: { status: "paid", providerRef: "pi_7" } });
  });

  it("does nothing without any connected provider", async () => {
    expect(await recoverPaidOrder({}, "p1", "fan@x.com")).toBeNull();
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });
});
