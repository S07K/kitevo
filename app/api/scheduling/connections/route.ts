import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SCHEDULERS, SCHEDULER_INFO, type Scheduler } from "@/lib/scheduler-links";
import { parseSchedulerInput, schedulerConnectionsFor } from "@/lib/scheduler-connections";

export const dynamic = "force-dynamic";

async function creatorId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, accountType: true } });
  return u && u.accountType !== "brand" ? u.id : null;
}

const shape = (r: { provider: string; url: string; createdAt: Date }) => ({ provider: r.provider, url: r.url, connectedAt: r.createdAt.toISOString() });

/** GET — the creator's connected scheduling pages. */
export async function GET() {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json((await schedulerConnectionsFor(userId)).map(shape));
}

/** POST { provider, url } — connect (or replace) a scheduling page. The link must belong to that provider. */
export async function POST(req: Request) {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { provider?: unknown; url?: unknown };
  if (!(SCHEDULERS as readonly string[]).includes(String(body.provider))) return NextResponse.json({ error: "Unknown scheduler." }, { status: 400 });
  const provider = body.provider as Scheduler;
  const parsed = await parseSchedulerInput(body.url);
  if (!parsed || parsed.provider !== provider) {
    return NextResponse.json({ error: `That doesn't look like a ${SCHEDULER_INFO[provider].name} link. It looks like ${SCHEDULER_INFO[provider].example}.`, field: "url" }, { status: 400 });
  }
  const row = await prisma.schedulerConnection.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, url: parsed.url },
    update: { url: parsed.url },
  });
  return NextResponse.json(shape(row), { status: 201 });
}

/** DELETE ?provider= — disconnect. Booking products using it stop showing until reconnected. */
export async function DELETE(req: Request) {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const provider = new URL(req.url).searchParams.get("provider") ?? "";
  if (!(SCHEDULERS as readonly string[]).includes(provider)) return NextResponse.json({ error: "Unknown scheduler." }, { status: 400 });
  await prisma.schedulerConnection.deleteMany({ where: { userId, provider } });
  return NextResponse.json({ ok: true });
}
