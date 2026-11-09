import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { block, unblock } from "@/lib/safety";

export const dynamic = "force-dynamic";

const id = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 64 ? v : null);

async function me() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** GET — the accounts I've blocked (for Settings), plus blocked inquiry emails for creators. */
export async function GET() {
  const userId = await me();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [rows, emails] = await Promise.all([
    prisma.userBlock.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        blocked: { select: { id: true, name: true, username: true, avatarUrl: true, accountType: true, brandProfile: { select: { companyName: true, logoUrl: true } } } },
      },
    }),
    prisma.inquiryBlock.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { email: true, createdAt: true } }),
  ]);
  return NextResponse.json({
    accounts: rows.map((r) => {
      const brand = r.blocked.accountType === "brand";
      return {
        id: r.blocked.id,
        name: (brand ? r.blocked.brandProfile?.companyName : null) ?? r.blocked.name ?? r.blocked.username ?? "Account",
        avatarUrl: (brand ? r.blocked.brandProfile?.logoUrl : null) ?? r.blocked.avatarUrl,
        accountType: r.blocked.accountType,
        blockedAt: r.createdAt.toISOString(),
      };
    }),
    emails: emails.map((e) => ({ email: e.email, blockedAt: e.createdAt.toISOString() })),
  });
}

/** POST { userId } — block an account. Idempotent. */
export async function POST(req: Request) {
  const userId = await me();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { userId?: unknown };
  const target = id(body.userId);
  if (!target || target === userId) return NextResponse.json({ error: "Pick an account to block." }, { status: 400 });
  if (!(await prisma.user.findUnique({ where: { id: target }, select: { id: true } }))) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  await block(userId, target);
  return NextResponse.json({ ok: true, blocked: true });
}

/** DELETE ?userId= — unblock. */
export async function DELETE(req: Request) {
  const userId = await me();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const target = id(new URL(req.url).searchParams.get("userId"));
  if (!target) return NextResponse.json({ error: "Pick an account to unblock." }, { status: 400 });
  await unblock(userId, target);
  return NextResponse.json({ ok: true, blocked: false });
}
