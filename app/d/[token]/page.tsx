import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dealForToken, publicDeal } from "@/lib/deal-access";
import { dealState } from "@/lib/deals";
import { payOptions } from "@/lib/deal-payments";
import { LogoMark } from "@/app/components/Logo";
import { DealView } from "@/app/components/deals/DealView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Brand deal · Kitevo", robots: { index: false, follow: false } };

/**
 * The brand's private deal page (link in every email to the brand). Works without a Kitevo
 * account: review, accept or counter the terms, and pay the creator directly.
 */
export default async function BrandDealPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ payment?: string }> }) {
  const { token } = await params;
  const deal = await dealForToken(token);
  if (!deal) notFound();
  const { current } = dealState(deal);
  const payWith = current ? await payOptions(deal.creatorId, current.currency) : [];
  const creatorName = deal.creator.name || deal.creator.username || "Creator";
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <LogoMark size={22} on="auto" /> Kitevo
          </Link>
          <span className="text-xs text-muted-foreground">Private deal page for {deal.brandName}</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Deal with {creatorName}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{deal.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Review the terms, accept or counter them, and pay {creatorName} directly. Everything here is recorded for both of you.</p>
        <div className="mt-8">
          <DealView initial={{ ...publicDeal(deal, "brand"), payWith }} token={token} paymentNotice={(await searchParams).payment ?? null} />
        </div>
      </main>
    </div>
  );
}
