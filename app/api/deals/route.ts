import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activeGuard, blockedGuard } from "@/lib/safety";
import { cleanEmail } from "@/lib/commerce-shared";
import { MAX_DEAL_TITLE, normalizeQuote } from "@/lib/deals-shared";
import { createDeal, DealError } from "@/lib/deals";

export const dynamic = "force-dynamic";

/** GET — deals I'm part of (as creator or as brand), newest activity first. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.deal.findMany({
    where: { OR: [{ creatorId: session.user.id }, { brandUserId: session.user.id }] },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { versions: { orderBy: { number: "desc" }, take: 1 }, payments: true, creator: { select: { name: true, username: true } } },
  });
  return NextResponse.json(
    rows.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      role: d.creatorId === session.user.id ? "creator" : "brand",
      counterpart: d.creatorId === session.user.id ? d.brandName : d.creator.name || d.creator.username || "Creator",
      amountCents: d.versions[0]?.amountCents ?? 0,
      currency: d.versions[0]?.currency ?? "INR",
      awaiting: d.status === "proposed" ? (d.versions[0]?.proposedBy === "creator" ? "brand" : "creator") : null,
      paidCents: d.payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amountCents, 0),
      dueCents: d.payments.filter((p) => p.status === "due" || p.status === "pending").reduce((a, p) => a + p.amountCents, 0),
      updatedAt: d.updatedAt,
    })),
  );
}

/**
 * POST { source, ref?, title, quote, brandName?, brandEmail? } — start a deal.
 *  - creator: from an accepted/pending campaign application, a conversation with a brand,
 *    a kit inquiry, or "direct" (brand name + email typed in).
 *  - brand:   from an application to their campaign, or a conversation with a creator.
 * The other side is always derived from the source on the server, never trusted from the client.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, include: { brandProfile: true } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const quote = normalizeQuote(body.quote);
  if (!quote.ok) return NextResponse.json({ error: quote.error, field: quote.field }, { status: 400 });
  const title = typeof body.title === "string" ? body.title.trim().slice(0, MAX_DEAL_TITLE) : "";
  if (!title) return NextResponse.json({ error: "Give the deal a short name (e.g. “Diwali Reel”).", field: "title" }, { status: 400 });
  const source = String(body.source ?? "direct");
  const ref = typeof body.ref === "string" ? body.ref : "";
  const isBrand = me.accountType === "brand";
  const brandDisplay = (u: { name: string | null; username: string | null; brandProfile?: { companyName: string | null } | null }) => u.brandProfile?.companyName || u.name || u.username || "Brand";

  let creatorId: string, brandUserId: string | null = null, brandName: string, brandEmail: string;
  const refs: { campaignApplicationId?: string; conversationId?: string; inquiryId?: string } = {};
  if (source === "campaign") {
    const app = await prisma.campaignApplication.findUnique({ where: { id: ref }, include: { campaign: { include: { brand: { include: { brandProfile: true } } } } } });
    if (!app || (app.creatorId !== me.id && app.campaign.brandId !== me.id)) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    creatorId = app.creatorId;
    brandUserId = app.campaign.brandId;
    brandName = brandDisplay(app.campaign.brand);
    brandEmail = app.campaign.brand.email;
    refs.campaignApplicationId = app.id;
  } else if (source === "conversation") {
    const parts = await prisma.conversationParticipant.findMany({ where: { conversationId: ref }, include: { user: { include: { brandProfile: true } } } });
    if (!parts.some((p) => p.userId === me.id)) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const other = parts.find((p) => p.userId !== me.id)?.user;
    if (!other || (other.accountType === "brand") === isBrand) return NextResponse.json({ error: "Deals are between a creator and a brand." }, { status: 400 });
    const brand = isBrand ? me : other;
    creatorId = isBrand ? other.id : me.id;
    brandUserId = brand.id;
    brandName = brandDisplay(brand);
    brandEmail = brand.email;
    refs.conversationId = ref;
  } else if (source === "inquiry" && !isBrand) {
    const inq = await prisma.inquiry.findUnique({ where: { id: ref }, include: { kit: { select: { userId: true } } } });
    if (!inq || inq.kit.userId !== me.id) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    creatorId = me.id;
    brandName = inq.company || inq.name;
    brandEmail = inq.email;
    refs.inquiryId = inq.id;
  } else if (source === "direct" && !isBrand) {
    const email = cleanEmail(body.brandEmail);
    const name = typeof body.brandName === "string" ? body.brandName.trim().slice(0, 100) : "";
    if (!name) return NextResponse.json({ error: "Who's the brand?", field: "brandName" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Enter the brand contact's email. That's where the deal link goes.", field: "brandEmail" }, { status: 400 });
    creatorId = me.id;
    brandName = name;
    brandEmail = email;
  } else {
    return NextResponse.json({ error: "Unknown deal source." }, { status: 400 });
  }
  const stop = (await activeGuard(me.id)) ?? (await blockedGuard(creatorId, brandUserId));
  if (stop) return stop;
  try {
    const deal = await createDeal({ creatorId, brandUserId, brandName, brandEmail, title, source: source as "campaign", ...refs, proposedBy: isBrand ? "brand" : "creator", quote: quote.value });
    return NextResponse.json({ id: deal.id }, { status: 201 });
  } catch (e) {
    if (e instanceof DealError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
