import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/deal-access", () => ({ dealForViewer: vi.fn(), publicDeal: (d: unknown, role: string) => ({ ...(d as object), role }) }));
vi.mock("@/lib/deals", async (orig) => {
  const real = await orig<typeof import("@/lib/deals")>();
  return { ...real, respond: vi.fn(async () => ({ id: "d1" })), proposeVersion: vi.fn(async () => ({ id: "d1" })), withdraw: vi.fn(async () => ({ id: "d1" })), cancel: vi.fn(async () => ({ id: "d1" })), markDelivered: vi.fn(async () => ({ id: "d1" })) };
});

const { dealForViewer } = await import("@/lib/deal-access");
const D = await import("@/lib/deals");
const { POST } = await import("./route");
const post = (b: object) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(b) }), { params: Promise.resolve({ id: "d1" }) });
const quote = { deliverables: [{ label: "Reel", quantity: 1 }], amount: "500", currency: "USD" };

describe("POST /api/deals/[id]/actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dealForViewer).mockResolvedValue({ deal: {} as never, role: "brand", userId: null });
  });

  it("strangers get 404 (no probing deal ids)", async () => {
    vi.mocked(dealForViewer).mockResolvedValueOnce(null);
    expect((await post({ action: "accept" })).status).toBe(404);
    expect(D.respond).not.toHaveBeenCalled();
  });

  it("passes the viewer's real role (from session or token), never one from the body", async () => {
    await post({ action: "accept", role: "creator", token: "tok" });
    expect(dealForViewer).toHaveBeenCalledWith("d1", "tok");
    expect(D.respond).toHaveBeenCalledWith("d1", "brand", "accept");
  });

  it("validates counter-offers before they reach the deal", async () => {
    const bad = await post({ action: "propose", quote: { ...quote, deliverables: [] } });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ field: "deliverables" });
    await post({ action: "propose", quote });
    expect(D.proposeVersion).toHaveBeenCalledWith("d1", "brand", expect.objectContaining({ amountCents: 50000, currency: "USD" }));
  });

  it("maps each action, and refuses unknown ones", async () => {
    for (const [action, fn] of [["decline", D.respond], ["withdraw", D.withdraw], ["cancel", D.cancel], ["deliver", D.markDelivered]] as const) {
      await post({ action });
      expect(fn).toHaveBeenCalled();
    }
    expect((await post({ action: "pay-me-twice" })).status).toBe(400);
  });

  it("a rule violation from the deal comes back as its status, not a crash", async () => {
    vi.mocked(D.markDelivered).mockRejectedValueOnce(new D.DealError("That isn't possible at this stage of the deal.", 409));
    const r = await post({ action: "deliver" });
    expect(r.status).toBe(409);
  });
});
