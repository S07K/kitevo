import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { analyticsEvent: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn() } },
}));

const { prisma } = await import("@/lib/prisma");
const { trackEvent, trackKitFirstView, getFunnel, _resetFirstViewCache } = await import("./analytics");
const create = vi.mocked(prisma.analyticsEvent.create);
const findMany = vi.mocked(prisma.analyticsEvent.findMany);
const createMany = vi.mocked(prisma.analyticsEvent.createMany);

beforeEach(() => {
  vi.clearAllMocks();
  _resetFirstViewCache();
});

describe("trackEvent", () => {
  it("writes the event with JSON props", async () => {
    create.mockResolvedValue({} as never);
    await trackEvent("kit_created", { userId: "u1", props: { kitId: "k1", kitNumber: 1 } });
    expect(create).toHaveBeenCalledWith({
      data: { name: "kit_created", userId: "u1", props: '{"kitId":"k1","kitNumber":1}', dedupeKey: null },
    });
  });

  it("dedupes keyed events with skipDuplicates instead of erroring", async () => {
    createMany.mockResolvedValue({ count: 0 } as never);
    await trackEvent("onboarding_complete", { userId: "u1", dedupeKey: "onboarding_complete:u1" });
    expect(createMany).toHaveBeenCalledWith({
      data: [{ name: "onboarding_complete", userId: "u1", props: null, dedupeKey: "onboarding_complete:u1" }],
      skipDuplicates: true,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("never throws — a DB error is swallowed", async () => {
    create.mockRejectedValueOnce(new Error("db down"));
    await expect(trackEvent("signup", { userId: "u1" })).resolves.toBeUndefined();
  });
});

describe("trackKitFirstView", () => {
  it("records once per kit per process, keyed for cross-instance dedupe", async () => {
    createMany.mockResolvedValue({ count: 1 } as never);
    await trackKitFirstView("k1", "owner");
    await trackKitFirstView("k1", "owner");
    await trackKitFirstView("k2", "owner");
    expect(createMany).toHaveBeenCalledTimes(2);
    expect(createMany.mock.calls[0][0]).toMatchObject({ data: [{ name: "kit_first_view", dedupeKey: "kit_first_view:k1" }] });
  });
});

describe("getFunnel", () => {
  it("counts distinct cohort users per step, as % of signups", async () => {
    findMany.mockImplementation((async (args: { where: { name: string } }) => {
      const byEvent: Record<string, string[]> = {
        signup: ["a", "b", "c", "d"],
        onboarding_complete: ["a", "b", "c"],
        kit_created: ["a", "b"],
        kit_first_view: ["a"],
        checkout_started: ["a"],
        upgrade: [],
        subscription_canceled: [],
      };
      return (byEvent[args.where.name] ?? []).map((userId) => ({ userId }));
    }) as never);

    const { rows, canceled } = await getFunnel(new Date(0));
    expect(rows.map((r) => [r.event, r.users, r.pctOfSignups])).toEqual([
      ["signup", 4, 100],
      ["onboarding_complete", 3, 75],
      ["kit_created", 2, 50],
      ["kit_first_view", 1, 25],
      ["checkout_started", 1, 25],
      ["upgrade", 0, 0],
    ]);
    expect(canceled).toBe(0);
  });

  it("handles an empty cohort", async () => {
    findMany.mockResolvedValue([] as never);
    const { rows } = await getFunnel(new Date(0));
    expect(rows.every((r) => r.users === 0 && r.pctOfSignups === null)).toBe(true);
  });
});
