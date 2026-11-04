import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { product: { findUnique: vi.fn() }, order: { create: vi.fn(), update: vi.fn(), delete: vi.fn() }, user: { findUnique: vi.fn() } } }));
vi.mock("@/lib/creator-plan", () => ({ hasPaidCreatorPlan: vi.fn() }));
vi.mock("@/lib/payment-connections", () => ({ razorpayKeysFor: vi.fn(), stripeKeyFor: vi.fn() }));
vi.mock("@/lib/stripe-creator", () => ({ createCheckoutSession: vi.fn() }));
vi.mock("@/lib/app-url", () => ({ APP_URL: "https://getkitevo.com" }));
vi.mock("@/lib/razorpay", () => ({ createOrder: vi.fn() }));
vi.mock("@/lib/paid-orders", () => ({ recoverPaidOrder: vi.fn() }));

const { prisma } = await import("@/lib/prisma");
const { hasPaidCreatorPlan } = await import("@/lib/creator-plan");
const { razorpayKeysFor, stripeKeyFor } = await import("@/lib/payment-connections");
const { createCheckoutSession } = await import("@/lib/stripe-creator");
const { createOrder } = await import("@/lib/razorpay");
const { recoverPaidOrder } = await import("@/lib/paid-orders");
const { POST } = await import("./route");

const product = (over = {}) => ({ id: "p1", userId: "u_seller", type: "download", status: "published", priceCents: 49900, currency: "INR", deliveryUrl: "https://drive.google.com/x", title: "Guide", ...over });
const post = (b: object = { email: "fan@x.com" }) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(b) }), { params: Promise.resolve({ id: "p1" }) });

describe("POST /api/products/[id]/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.product.findUnique).mockResolvedValue(product() as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Sana" } as never);
    vi.mocked(prisma.order.create).mockResolvedValue({ id: "ord_1" } as never);
    vi.mocked(prisma.order.delete).mockResolvedValue({} as never);
    vi.mocked(hasPaidCreatorPlan).mockResolvedValue(true);
    vi.mocked(razorpayKeysFor).mockResolvedValue({ keyId: "rzp_test_abcdefgh12", keySecret: "s" });
    vi.mocked(stripeKeyFor).mockResolvedValue(null);
    vi.mocked(createOrder).mockResolvedValue({ id: "order_RP1", amount: 49900, currency: "INR", status: "created" });
  });

  it("creates a pending order and a Razorpay order for the product's own price", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(prisma.order.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "pending", amountCents: 49900, currency: "INR", provider: "razorpay" }) });
    expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({ keyId: "rzp_test_abcdefgh12" }), expect.objectContaining({ amount: 49900, currency: "INR", receipt: "ord_1" }));
    expect(await res.json()).toMatchObject({ keyId: "rzp_test_abcdefgh12", razorpayOrderId: "order_RP1", amount: 49900 });
  });

  it("ignores any amount the client sends", async () => {
    await post({ email: "fan@x.com", amount: 1, priceCents: 1 });
    expect(createOrder).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ amount: 49900 }));
  });

  it("refuses free, unpublished, or unavailable products", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(product({ priceCents: 0 }) as never);
    expect((await post()).status).toBe(404);
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(product({ status: "draft" }) as never);
    expect((await post()).status).toBe(404);
    vi.mocked(hasPaidCreatorPlan).mockResolvedValueOnce(false);
    expect((await post()).status).toBe(409);
    vi.mocked(razorpayKeysFor).mockResolvedValueOnce(null);
    expect((await post()).status).toBe(409);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("hands back the link instead of charging again when an earlier attempt was paid", async () => {
    vi.mocked(recoverPaidOrder).mockResolvedValueOnce("https://getkitevo.com/o/tok");
    const res = await post();
    expect(await res.json()).toEqual({ alreadyPaid: true, accessUrl: "https://getkitevo.com/o/tok" });
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("uses Stripe Checkout when asked (or when it's the only account) and returns its URL", async () => {
    vi.mocked(stripeKeyFor).mockResolvedValue("rk_test_key");
    vi.mocked(createCheckoutSession).mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" } as never);
    const res = await post({ email: "fan@x.com", provider: "stripe" });
    expect(await res.json()).toEqual({ provider: "stripe", orderId: "ord_1", redirectUrl: "https://checkout.stripe.com/c/pay/cs_1" });
    expect(createCheckoutSession).toHaveBeenCalledWith("rk_test_key", expect.objectContaining({ amount: 49900, currency: "INR", successUrl: "https://getkitevo.com/api/orders/ord_1/stripe-return?session_id={CHECKOUT_SESSION_ID}" }));
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: "ord_1" }, data: { providerOrderId: "cs_1" } });
    expect(createOrder).not.toHaveBeenCalled();

    vi.mocked(razorpayKeysFor).mockResolvedValue(null);
    await post();
    expect(createCheckoutSession).toHaveBeenCalledTimes(2);
  });

  it("refuses a provider the creator hasn't connected", async () => {
    expect((await post({ email: "fan@x.com", provider: "stripe" })).status).toBe(409);
  });

  it("removes the pending order if Razorpay fails", async () => {
    vi.mocked(createOrder).mockImplementationOnce(() => {
      throw new Error("down");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post()).status).toBe(502);
    expect(prisma.order.delete).toHaveBeenCalledWith({ where: { id: "ord_1" } });
  });
});
