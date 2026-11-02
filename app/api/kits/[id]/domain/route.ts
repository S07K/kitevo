import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  STALE_PENDING_MS,
  canUseCustomDomain,
  dnsRecords,
  parseHostname,
  parseVerification,
  providerMessage,
  publicDomain,
  refreshDomain,
  vercelConfigured,
  vercelDomains,
} from "@/lib/custom-domains";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** The signed-in owner's kit, or a response to return. */
async function ownKit(ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { id } = await ctx.params;
  const kit = await prisma.kit.findFirst({ where: { id, userId: session.user.id }, select: { id: true, slug: true, userId: true } });
  if (!kit) return { error: NextResponse.json({ error: "Kit not found" }, { status: 404 }) };
  return { kit };
}

/** GET — the kit's domain (if any), whether the plan allows one, and whether hosting is set up. */
export async function GET(_req: Request, ctx: Ctx) {
  const r = await ownKit(ctx);
  if (r.error) return r.error;
  const [allowed, row] = await Promise.all([
    canUseCustomDomain(r.kit.userId),
    prisma.customDomain.findUnique({ where: { kitId: r.kit.id } }),
  ]);
  const domain = row
    ? publicDomain(row, dnsRecords({ hostname: row.hostname, apexName: row.apexName, verification: parseVerification(row.verification) }))
    : null;
  return NextResponse.json({ allowed, configured: vercelConfigured(), domain });
}

/** POST { hostname } — connect a domain to this kit (Starter+). */
export async function POST(req: Request, ctx: Ctx) {
  const r = await ownKit(ctx);
  if (r.error) return r.error;
  if (!(await canUseCustomDomain(r.kit.userId))) {
    return NextResponse.json({ error: "Custom domains are included in Starter and Pro.", code: "plan_required" }, { status: 403 });
  }
  if (!vercelConfigured()) {
    return NextResponse.json({ error: "Custom domains aren't set up on this server yet.", code: "not_configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = parseHostname((body as { hostname?: unknown }).hostname);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const hostname = parsed.hostname;

  if (await prisma.customDomain.findUnique({ where: { kitId: r.kit.id }, select: { id: true } })) {
    return NextResponse.json({ error: "This kit already has a domain. Remove it first." }, { status: 409 });
  }
  const existing = await prisma.customDomain.findUnique({ where: { hostname } });
  if (existing) {
    const stale = existing.status !== "active" && Date.now() - existing.createdAt.getTime() > STALE_PENDING_MS;
    if (existing.userId !== r.kit.userId && !stale) {
      return NextResponse.json({ error: "That domain is already connected to a Kitevo kit." }, { status: 409 });
    }
    if (existing.userId === r.kit.userId && !stale) {
      return NextResponse.json({ error: "That domain is already connected to another of your kits." }, { status: 409 });
    }
    // An abandoned claim (never activated, over a week old): free it for the new owner.
    await prisma.customDomain.delete({ where: { id: existing.id } });
  }

  try {
    await vercelDomains.add(hostname).catch(async (e) => {
      // Already on our own project (e.g. left behind by an abandoned claim) is fine; on
      // anyone else's it's a real conflict. Ask rather than guess from the error code.
      const ours = await vercelDomains.get(hostname).catch(() => null);
      if (ours) return ours;
      throw e;
    });
  } catch (e) {
    return NextResponse.json({ error: providerMessage(e) }, { status: 502 });
  }
  const row = await prisma.customDomain.create({ data: { hostname, kitId: r.kit.id, userId: r.kit.userId } });
  const { domain, records } = await refreshDomain(row.id);
  return NextResponse.json({ domain: publicDomain(domain, records) }, { status: 201 });
}

/** DELETE — disconnect the kit's domain. The kit's Kitevo URL keeps working. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const r = await ownKit(ctx);
  if (r.error) return r.error;
  const row = await prisma.customDomain.findUnique({ where: { kitId: r.kit.id } });
  if (!row) return NextResponse.json({ ok: true });
  try {
    if (vercelConfigured()) await vercelDomains.remove(row.hostname);
  } catch (e) {
    return NextResponse.json({ error: providerMessage(e) }, { status: 502 });
  }
  await prisma.customDomain.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
