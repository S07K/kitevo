import { notFound } from "next/navigation";
import Link from "next/link";
import { requireWorkspaceUser } from "@/lib/workspace-user";
import { dealForViewer, publicDeal } from "@/lib/deal-access";
import { dealState } from "@/lib/deals";
import { payOptions } from "@/lib/deal-payments";
import { WorkspaceShell, PageHeader } from "@/app/components/workspace/WorkspaceShell";
import { DealView } from "@/app/components/deals/DealView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deal · Kitevo" };

export default async function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ payment?: string }> }) {
  const { id } = await params;
  await requireWorkspaceUser(`/deals/${id}`);
  const v = await dealForViewer(id, null);
  if (!v) notFound();
  const { current } = dealState(v.deal);
  const payWith = current ? await payOptions(v.deal.creatorId, current.currency) : [];
  const other = v.role === "creator" ? v.deal.brandName : v.deal.creator.name || v.deal.creator.username || "Creator";
  return (
    <WorkspaceShell width="wide">
      <p className="mb-3 text-xs"><Link href="/deals" className="text-muted-foreground hover:text-foreground">← All deals</Link></p>
      <PageHeader eyebrow={`Deal with ${other}`} title={v.deal.title} />
      <DealView initial={{ ...publicDeal(v.deal, v.role), payWith }} paymentNotice={(await searchParams).payment ?? null} />
    </WorkspaceShell>
  );
}
