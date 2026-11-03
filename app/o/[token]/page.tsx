import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { kitAppearanceToCssVarsWithOverrides } from "@/lib/kit-appearance";
import { storefrontSeller } from "@/lib/creator-storefront";
import { LogoMark } from "@/app/components/Logo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your download", robots: { index: false, follow: false } };

/** A buyer's private delivery page (link in their email). The only place the file link appears. */
export default async function DeliveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  const order = await prisma.order.findUnique({ where: { accessToken: token }, include: { product: true } });
  if (!order || (order.status !== "free" && order.status !== "paid") || !order.product.deliveryUrl) notFound();
  const seller = await storefrontSeller(order.sellerId);
  return (
    <div className="min-h-screen bg-[var(--mk-bg)] text-[var(--mk-text)] antialiased" style={kitAppearanceToCssVarsWithOverrides(seller.appearance)}>
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-16">
        <p className="font-sans text-sm text-[var(--mk-text-muted)]">From {seller.name}</p>
        <h1 className="mt-2 text-balance font-display text-4xl font-semibold leading-tight tracking-tight">{order.product.title}</h1>
        {order.product.deliveryNote && (
          <p className="mt-4 whitespace-pre-line font-sans text-base leading-relaxed text-[var(--mk-text-muted)]">{order.product.deliveryNote}</p>
        )}
        <a
          href={order.product.deliveryUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-8 inline-flex h-12 w-fit items-center rounded-full bg-[var(--mk-text)] px-7 font-sans text-sm font-semibold text-[var(--mk-bg)] transition-opacity hover:opacity-90"
        >
          Open your download
        </a>
        <p className="mt-4 font-sans text-xs text-[var(--mk-text-soft)]">This page is private to you. Bookmark it or keep the email.</p>
        <div className="mt-12 flex items-center justify-between border-t border-[var(--mk-border-hairline)] pt-6 font-sans text-xs text-[var(--mk-text-soft)]">
          {seller.kitSlug ? <Link href={`/kit/${seller.kitSlug}`} className="hover:text-[var(--mk-text)]">More from {seller.name}</Link> : <span />}
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-[var(--mk-text)]">
            <LogoMark size={13} mono on="auto" /> Kitevo
          </Link>
        </div>
      </main>
    </div>
  );
}
