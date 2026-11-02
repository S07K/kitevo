import { describe, it, expect, vi, beforeEach } from "vitest";

const parseWebhook = vi.fn();
const webhookDeliveryId = vi.fn();
class WebhookVerificationError extends Error {}

vi.mock("@/lib/payments", () => ({
  payments: { id: "dodo", parseWebhook, webhookDeliveryId },
  WebhookVerificationError,
}));
vi.mock("@/lib/payment-events", () => ({ applyPaymentEvent: vi.fn() }));
vi.mock("@/lib/webhook-log", () => ({
  logDelivery: vi.fn(),
  logRejected: vi.fn(),
  wasDeliveryProcessed: vi.fn(),
}));

const { POST } = await import("./route");
const { applyPaymentEvent } = await import("@/lib/payment-events");
const { logDelivery, logRejected, wasDeliveryProcessed } = await import("@/lib/webhook-log");

const req = () => new Request("http://x/api/webhook", { method: "POST", body: "{}" });
const event = { type: "subscription.canceled", customerId: "cus_1", subscriptionId: "sub_1" } as const;

describe("POST /api/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseWebhook.mockResolvedValue(event);
    webhookDeliveryId.mockReturnValue("msg_1");
    vi.mocked(wasDeliveryProcessed).mockResolvedValue(false);
    vi.mocked(applyPaymentEvent).mockResolvedValue({ status: "processed" });
  });

  it("rejects a bad signature with 400 and logs the rejection", async () => {
    parseWebhook.mockRejectedValue(new WebhookVerificationError("bad sig"));
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(logRejected).toHaveBeenCalledWith("dodo", "bad sig");
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("applies and logs a verified delivery", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(applyPaymentEvent).toHaveBeenCalledWith(event);
    expect(logDelivery).toHaveBeenCalledWith({
      provider: "dodo",
      deliveryId: "msg_1",
      event,
      status: "processed",
      error: null,
    });
  });

  it("acknowledges a retry of an applied delivery without re-applying it", async () => {
    vi.mocked(wasDeliveryProcessed).mockResolvedValue(true);
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect((await res.json()).duplicate).toBe(true);
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("answers 200 but logs failed when applying throws", async () => {
    vi.mocked(applyPaymentEvent).mockRejectedValue(new Error("db down"));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(logDelivery).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", error: "db down" }));
  });
});
