import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/subscription-for-request", () => ({
  getAllowedKitsForUser: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/fake" }),
      },
    },
  },
}));

vi.mock("@/config/subscriptions", () => ({
  getPriceIdForTier: vi.fn((tier: string) => (tier === "starter" || tier === "pro" ? "price_fake" : null)),
}));

const { getServerSession } = await import("next-auth");
const { getAllowedKitsForUser } = await import("@/lib/subscription-for-request");

describe("POST /api/create-checkout-session", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(getAllowedKitsForUser).mockResolvedValue(0);
  });

  it("returns 409 when logged-in user already has an active subscription", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "subscribed@example.com" },
      expires: "",
    });
    vi.mocked(getAllowedKitsForUser).mockResolvedValue(3);

    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ tierId: "starter" }),
      })
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe(
      "You already have an active subscription. Manage it from your dashboard."
    );
  });

  it("allows checkout when logged in but not subscribed (allowedKits 0)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      expires: "",
    });
    vi.mocked(getAllowedKitsForUser).mockResolvedValue(0);

    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ tierId: "starter", email: "user@example.com" }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/fake");
  });

  it("allows checkout when not logged in", async () => {
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ email: "guest@example.com", tierId: "pro" }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveProperty("url");
  });
});
