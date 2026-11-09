import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/deal-access", () => ({ dealForViewer: vi.fn(), publicDeal: (d: unknown, role: string) => ({ ...(d as object), role }) }));
vi.mock("@/lib/deals", async (orig) => {
  const real = await orig<typeof import("@/lib/deals")>();
  return { ...real, respond: vi.fn(async () => ({ id: "d1" })), proposeVersion: vi.fn(async () => ({ id: "d1" })), withdraw: vi.fn(async () => ({ id: "d1" })), cancel: vi.fn(async () => ({ id: "d1" })), markDelivered: vi.fn(async () => ({ id: "d1" })) };
});
vi.mock("@/lib/safety", () => ({ activeGuard: vi.fn(async () => null), blockedGuard: vi.fn(async () => null) }));

const { dealForViewer } = await import("@/lib/deal-access");
const D = await import("@/lib/deals");
const { blockedGuard } = await import("@/lib/safety");
const { POST } = await import("./route");
const post = (b: object) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(b) }), { params: Promise.resolve({ id: "d1" }) });
const blocked = () => new Response(JSON.stringify({ code: "blocked" }), { status: 403 });

describe("deal actions under a block", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dealForViewer).mockResolvedValue({ deal: { creatorId: "c1", brandUserId: "b1" } as never, role: "brand", userId: "b1" });
  });

  it("no new terms: accept and propose are refused", async () => {
    vi.mocked(blockedGuard).mockResolvedValue(blocked() as never);
    expect((await post({ action: "accept" })).status).toBe(403);
    expect((await post({ action: "propose", quote: { deliverables: [{ label: "Reel", quantity: 1 }], amount: "500", currency: "USD" } })).status).toBe(403);
    expect(blockedGuard).toHaveBeenCalledWith("c1", "b1");
    expect(D.respond).not.toHaveBeenCalled();
    expect(D.proposeVersion).not.toHaveBeenCalled();
  });

  it("finishing is still allowed: decline, withdraw, cancel, deliver", async () => {
    vi.mocked(blockedGuard).mockResolvedValue(blocked() as never);
    expect((await post({ action: "decline" })).status).toBe(200);
    expect((await post({ action: "withdraw" })).status).toBe(200);
    expect((await post({ action: "cancel" })).status).toBe(200);
    vi.mocked(dealForViewer).mockResolvedValue({ deal: { creatorId: "c1", brandUserId: "b1" } as never, role: "creator", userId: "c1" });
    expect((await post({ action: "deliver" })).status).toBe(200);
    expect(blockedGuard).not.toHaveBeenCalled();
  });
});
