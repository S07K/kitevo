import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { kit: { findFirst: vi.fn(), update: vi.fn() } } }));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { PUT } = await import("./route");

const kitRow = { id: "k1", userId: "u1", slug: "sana", name: "Kit", passwordHash: null, workSamples: "[]", rates: "{}", brands: "[]", sectionVisibility: "{}", appearance: "{}", manualStats: "{}", booking: "{}" };
const put = (booking: unknown) => PUT(new Request("http://x", { method: "PUT", body: JSON.stringify({ booking }) }), { params: Promise.resolve({ id: "k1" }) });
const saved = () => JSON.parse((vi.mocked(prisma.kit.update).mock.calls.at(-1)![0] as { data: { booking: string } }).data.booking);

describe("PUT /api/kits/[id] — Book a call", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" }, expires: "" } as never);
    vi.mocked(prisma.kit.findFirst).mockResolvedValue(kitRow as never);
    vi.mocked(prisma.kit.update).mockImplementation((async ({ data }: { data: Record<string, string> }) => ({ ...kitRow, ...data })) as never);
  });

  it("saves a scheduler link (canonical) with a tidied label and returns it", async () => {
    const res = await put({ url: "www.calendly.com/sana/intro?month=x", label: "  Partnership   intro " });
    expect(res.status).toBe(200);
    expect(saved()).toEqual({ url: "https://calendly.com/sana/intro", label: "Partnership intro" });
    expect((await res.json()).booking).toEqual({ url: "https://calendly.com/sana/intro", label: "Partnership intro" });
  });

  it("resolves Google short links to the embeddable appointment page (no real network)", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1abcDEFghiJKLmnoPQR?gv=true" } }));
    vi.stubGlobal("fetch", fetchMock);
    await put({ url: "calendar.app.google/AbCdEf123456", label: "" });
    vi.unstubAllGlobals();
    expect(fetchMock).toHaveBeenCalledWith("https://calendar.app.google/AbCdEf123456", expect.objectContaining({ redirect: "manual" }));
    expect(saved().url).toBe("https://calendar.google.com/calendar/appointments/schedules/AcZssZ1abcDEFghiJKLmnoPQR");
  });

  it("refuses links that aren't a known scheduler", async () => {
    const res = await put({ url: "https://example.com/book", label: "x" });
    expect(res.status).toBe(400);
    expect(prisma.kit.update).not.toHaveBeenCalled();
  });

  it("an empty link turns the button off", async () => {
    await put({ url: "", label: "Keep my label" });
    expect(saved()).toEqual({ url: null, label: "Keep my label" });
  });
});
