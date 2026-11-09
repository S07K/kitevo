import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: { kit: { findUnique: vi.fn() }, inquiry: { create: vi.fn(async () => ({ id: "q1" })) }, inquiryBlock: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/email", () => ({ sendInquiryNotification: vi.fn(async () => {}) }));

const { prisma } = await import("@/lib/prisma");
const { sendInquiryNotification } = await import("@/lib/email");
const { POST } = await import("./route");

const send = (body: object) => POST(new NextRequest("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "k1" }) });
const FORM = { name: "Rhea", email: "Rhea@Oats.example", company: "Oats Co", message: "Collab?" };
const KIT = { id: "k1", name: "Asha", slug: "asha", userId: "c1", user: { email: "asha@x.com", name: "Asha", suspendedAt: null } };

describe("POST /api/kits/[id]/inquire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.kit.findUnique).mockResolvedValue(KIT as never);
    vi.mocked(prisma.inquiryBlock.findUnique).mockResolvedValue(null);
  });

  it("stores the inquiry and tells the creator", async () => {
    expect((await send(FORM)).status).toBe(201);
    expect(prisma.inquiry.create).toHaveBeenCalled();
    expect(sendInquiryNotification).toHaveBeenCalled();
  });

  it("a blocked sender looks successful but nothing is stored or sent", async () => {
    vi.mocked(prisma.inquiryBlock.findUnique).mockResolvedValueOnce({ id: "b" } as never);
    const res = await send(FORM);
    expect(res.status).toBe(201);
    expect(prisma.inquiryBlock.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_email: { userId: "c1", email: "rhea@oats.example" } } }));
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
    expect(sendInquiryNotification).not.toHaveBeenCalled();
  });

  it("a suspended creator's kit takes no inquiries", async () => {
    vi.mocked(prisma.kit.findUnique).mockResolvedValueOnce({ ...KIT, user: { ...KIT.user, suspendedAt: new Date() } } as never);
    expect((await send(FORM)).status).toBe(404);
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
  });
});
