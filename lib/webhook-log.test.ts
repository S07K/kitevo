import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEvent: { findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/payment-events", () => ({ applyPaymentEvent: vi.fn() }));

const { prisma } = await import("@/lib/prisma");
const { applyPaymentEvent } = await import("@/lib/payment-events");
const { logDelivery, logRejected, replayWebhookEvent, wasDeliveryProcessed } = await import("./webhook-log");

const event = { type: "payment.refunded", paymentId: "pay_1", refundId: "re_1", amount: null } as const;

describe("webhook-log", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts by delivery id so a retry bumps attempts instead of adding a row", async () => {
    await logDelivery({ provider: "dodo", deliveryId: "msg_1", event, status: "processed" });
    const call = vi.mocked(prisma.webhookEvent.upsert).mock.calls[0][0];
    expect(call.where).toEqual({ provider_deliveryId: { provider: "dodo", deliveryId: "msg_1" } });
    expect(call.update).toMatchObject({ attempts: { increment: 1 }, status: "processed" });
    expect(JSON.parse(call.create.payload as string)).toEqual(event);
  });

  it("stores no payload for ignored events", async () => {
    await logDelivery({
      provider: "dodo", deliveryId: null, event: { type: "ignored", providerEventType: "dispute.opened" }, status: "ignored",
    });
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ payload: null, providerType: "dispute.opened", deliveryId: null }),
    });
  });

  it("never throws when the log write fails", async () => {
    vi.mocked(prisma.webhookEvent.upsert).mockRejectedValue(new Error("db down"));
    await expect(logDelivery({ provider: "dodo", deliveryId: "m", event, status: "processed" })).resolves.toBeUndefined();
    await expect(logRejected("dodo", "bad")).resolves.toBeUndefined();
  });

  it("buckets signature failures into one row per provider per hour", async () => {
    await logRejected("dodo", "bad sig", new Date("2026-11-01T10:59:00Z"));
    await logRejected("dodo", "bad sig", new Date("2026-11-01T10:01:00Z"));
    await logRejected("dodo", "bad sig", new Date("2026-11-01T11:00:00Z"));
    const ids = vi.mocked(prisma.webhookEvent.upsert).mock.calls.map((c) => c[0].where.provider_deliveryId?.deliveryId);
    expect(ids).toEqual(["rejected:2026-11-01T10", "rejected:2026-11-01T10", "rejected:2026-11-01T11"]);
  });

  it("treats processed and ignored deliveries as done, failed ones as retryable", async () => {
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValueOnce({ status: "processed" } as never);
    expect(await wasDeliveryProcessed("dodo", "a")).toBe(true);
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValueOnce({ status: "failed" } as never);
    expect(await wasDeliveryProcessed("dodo", "b")).toBe(false);
    expect(await wasDeliveryProcessed("dodo", null)).toBe(false);
  });

  it("replays the stored event and records the new outcome", async () => {
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue({ id: "w1", payload: JSON.stringify(event) } as never);
    vi.mocked(applyPaymentEvent).mockResolvedValue({ status: "processed" });
    expect(await replayWebhookEvent("w1")).toEqual({ status: "processed" });
    expect(applyPaymentEvent).toHaveBeenCalledWith(event);
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
      where: { id: "w1" },
      data: { status: "processed", error: null, attempts: { increment: 1 } },
    });
  });

  it("has nothing to replay for rows without a payload", async () => {
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue({ id: "w1", payload: null } as never);
    expect(await replayWebhookEvent("w1")).toBeNull();
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });
});
