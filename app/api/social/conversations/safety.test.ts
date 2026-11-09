import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    conversation: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    conversationParticipant: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    message: { create: vi.fn() },
    userBlock: { findMany: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const list = await import("./route");
const thread = await import("./[id]/route");

const post = (body: object) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });
const params = Promise.resolve({ id: "conv1" });

describe("conversations and blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "me" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ accountType: "creator", suspendedAt: null } as never);
    vi.mocked(prisma.userBlock.findMany).mockResolvedValue([]);
  });

  it("can't start a new conversation when blocked either way", async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.userBlock.findMany).mockResolvedValueOnce([{ blockerId: "other" }] as never);
    const res = await list.POST(post({ otherUserId: "other" }));
    expect(res.status).toBe(403);
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });

  it("an existing thread still opens (readable), even when blocked", async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValueOnce({ id: "conv1" } as never);
    const res = await list.POST(post({ otherUserId: "other" }));
    expect(await res.json()).toEqual({ conversationId: "conv1" });
  });

  it("can't send messages into a blocked thread", async () => {
    vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue({ id: "p" } as never);
    vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValue({ userId: "other" } as never);
    vi.mocked(prisma.userBlock.findMany).mockResolvedValueOnce([{ blockerId: "me" }] as never);
    const res = await thread.POST(post({ body: "hello?" }), { params });
    expect(res.status).toBe(403);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it("suspended accounts can't send", async () => {
    vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue({ id: "p" } as never);
    vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValue({ userId: "other" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ suspendedAt: new Date() } as never);
    expect((await thread.POST(post({ body: "hi" }), { params })).status).toBe(403);
  });

  it("the list says who blocked whom, per conversation", async () => {
    const convo = (id: string, other: string) => ({
      conversation: { id, updatedAt: new Date(), messages: [], participants: [{ user: { id: other } }] },
      lastReadAt: null,
    });
    vi.mocked(prisma.conversationParticipant.findMany).mockResolvedValueOnce([convo("c1", "x"), convo("c2", "y"), convo("c3", "z")] as never);
    vi.mocked(prisma.userBlock.findMany).mockResolvedValueOnce([
      { blockerId: "me", blockedId: "x" },
      { blockerId: "y", blockedId: "me" },
    ] as never);
    const rows = (await (await list.GET()).json()) as Array<{ id: string; blocked: string | null }>;
    expect(rows.map((r) => [r.id, r.blocked])).toEqual([["c1", "me"], ["c2", "them"], ["c3", null]]);
  });
});
