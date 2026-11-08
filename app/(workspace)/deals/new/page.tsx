import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/workspace-user";
import { NewDealForm } from "./NewDealForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New deal · Kitevo" };

/**
 * Start a deal. ?source=campaign|conversation|inquiry&ref=<id> pre-fills the other side
 * (checked here and again by POST /api/deals); no source = a creator's direct deal.
 */
export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ source?: string; ref?: string }> }) {
  const { id: me, accountType } = await requireWorkspaceUser("/deals/new");
  const { source = "direct", ref = "" } = await searchParams;
  const isBrand = accountType === "brand";
  let counterpart: string | null = null;
  let title = "";
  if (source === "campaign") {
    const app = await prisma.campaignApplication.findUnique({ where: { id: ref }, include: { campaign: { include: { brand: { include: { brandProfile: true } } } }, creator: { select: { name: true, username: true } } } });
    if (!app || (app.creatorId !== me && app.campaign.brandId !== me)) notFound();
    counterpart = isBrand ? app.creator.name || app.creator.username || "Creator" : app.campaign.brand.brandProfile?.companyName || app.campaign.brand.name || "Brand";
    title = app.campaign.title;
  } else if (source === "conversation") {
    const parts = await prisma.conversationParticipant.findMany({ where: { conversationId: ref }, include: { user: { include: { brandProfile: true } } } });
    if (!parts.some((p) => p.userId === me)) notFound();
    const other = parts.find((p) => p.userId !== me)?.user;
    if (!other) notFound();
    counterpart = other.brandProfile?.companyName || other.name || other.username || "";
  } else if (source === "inquiry") {
    if (isBrand) notFound();
    const inq = await prisma.inquiry.findUnique({ where: { id: ref }, include: { kit: { select: { userId: true } } } });
    if (!inq || inq.kit.userId !== me) notFound();
    counterpart = inq.company ? `${inq.company} (${inq.name})` : inq.name;
  } else if (isBrand) {
    notFound(); // brands start deals from an application or a conversation
  }
  return <NewDealForm source={source} refId={ref} counterpart={counterpart} isBrand={isBrand} defaultTitle={title} />;
}
