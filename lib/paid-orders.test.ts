import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { order: { findMany: vi.fn(), updateMany: vi.fn() }, user: { findUnique: vi.fn() } } }));
vi.mock("@/lib/app-url", () => ({ APP_URL: "https://getkitevo.com" }));
vi.mock("@/lib/background", () => ({ inBackground: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendDownloadEmail: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/razorpay", () => ({ fetchOrderPayments: vi.fn() }));

const { prisma } = await import("@/lib/prisma");
const { fetchOrderPayments } = await import("@/lib/razorpay");
const { inBackground } = await import("@/lib/background");
const { recoverPaidOrder } = await import("./paid-orders");

const keys = { keyId: "rzp_test_abcdefgh12", keySecret: "s" };
const pending = { id: "ord_1", sellerId: "u", productId: "p1", buyerEmail: "fan@x.com", accessToken: "tok1", amountCents: 49900, currency: "INR", providerOrderId: "order_RP1", product: { title: "Guide" } };

describe("recoverPaidOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.order.findMany).mockResolvedValue([pending] as never);
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Sana" } as never);
  });

  it("marks a pending order paid when its Razorpay order has a matching captured payment", async () => {
    vi.mocked(fetchOrderPayments).mockResolvedValue([{ id: "pay_9", order_id: "order_RP1", amount: 49900, currency: "INR", status: "captured" }]);
    expect(await recoverPaidOrder(keys, "p1", "fan@x.com")).toBe("https://getkitevo.com/o/tok1");
    expect(prisma.order.updateMany).toHaveBeenCalledWith({ where: { id: "ord_1", status: "pending" }, data: { status: "paid", providerRef: "pay_9" } });
    expect(inBackground).toHaveBeenCalledTimes(1);
  });

  it("ignores failed, uncaptured or mismatched payments", async () => {
    vi.mocked(fetchOrderPayments).mockResolvedValue([
      { id: "pay_1", order_id: "order_RP1", amount: 49900, currency: "INR", status: "failed" },
      { id: "pay_2", order_id: "order_RP1", amount: 49900, currency: "INR", status: "authorized" },
      { id: "pay_3", order_id: "order_RP1", amount: 100, currency: "INR", status: "captured" },
    ]);
    expect(await recoverPaidOrder(keys, "p1", "fan@x.com")).toBeNull();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("survives a Razorpay lookup error", async () => {
    vi.mocked(fetchOrderPayments).mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await recoverPaidOrder(keys, "p1", "fan@x.com")).toBeNull();
  });
});
