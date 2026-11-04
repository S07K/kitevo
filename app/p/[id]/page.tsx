import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { kitAppearanceToCssVarsWithOverrides } from "@/lib/kit-appearance";
import { storefrontSeller } from "@/lib/creator-storefront";
import { canSellPaid } from "@/lib/commerce";
import { connectedProviders } from "@/lib/payment-connections";
import { paypalSupports } from "@/lib/paypal-creator";
import { formatPrice } from "@/lib/commerce-shared";
import { LogoMark } from "@/app/components/Logo";
import { ClaimForm } from "./ClaimForm";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return null;
  if (product.status !== "published") {
    // Drafts are visible to their owner only, as a preview.
    const session = await getServerSession(authOptions);
    if (session?.user?.id !== product.userId) return null;
  }
  const paid = product.priceCents > 0;
  const [seller, onSale, providers] = await Promise.all([
    storefrontSeller(product.userId),
    paid ? canSellPaid(product.userId, product.currency) : Promise.resolve(true),
    // PayPal only for currencies it can take (no INR).
    paid ? connectedProviders(product.userId).then((ps) => ps.filter((p) => p !== "paypal" || paypalSupports(product.currency))) : Promise.resolve([]),
  ]);
  return { product, seller, onSale, providers };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const r = await load((await params).id);
  if (!r) return { title: "Kitevo" };
  const title = `${r.product.title} by ${r.seller.name}`;
  const description = r.product.description.slice(0, 155) || (r.product.priceCents ? `A digital product from ${r.seller.name}.` : `A free download from ${r.seller.name}.`);
  return { title, description, openGraph: { title, description }, robots: r.product.status === "published" ? undefined : { index: false } };
}

/** A product's public page, in the creator's kit style: free downloads and paid products. */
/** Why the buyer is back from Stripe without a purchase (?checkout=…). */
const CHECKOUT_NOTICES: Record<string, string> = {
  cancelled: "Payment cancelled. You weren't charged.",
  processing: "Your payment is still processing. If you were charged, try again with the same email in a minute to get your link.",
  mismatch: "We couldn't match that payment to this order. If you were charged, try again with the same email to get your link.",
  unavailable: "This product isn't on sale right now. If you were charged, contact the creator.",
};

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ checkout?: string }> }) {
  const checkout = (await searchParams).checkout;
  const r = await load((await params).id);
  if (!r) notFound();
  const { product, seller, onSale, providers } = r;
  const draft = product.status !== "published";
  const paid = product.priceCents > 0;
  const price = formatPrice(product.priceCents, product.currency);
  return (
    <div className="min-h-screen bg-[var(--mk-bg)] text-[var(--mk-text)] antialiased" style={kitAppearanceToCssVarsWithOverrides(seller.appearance)}>
      {draft && (
        <p className="bg-amber-100 px-4 py-2 text-center font-sans text-xs text-amber-900">Draft preview. Only you can see this page until you publish it.</p>
      )}
      <header className="flex h-14 items-center justify-between border-b border-[var(--mk-border-hairline)] px-5 sm:px-8">
        {seller.kitSlug ? (
          <Link href={`/kit/${seller.kitSlug}`} className="flex items-center gap-2 font-sans text-sm text-[var(--mk-text-muted)] hover:text-[var(--mk-text)]">
            {seller.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- base64 avatar
              <img src={seller.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : null}
            {seller.name}
          </Link>
        ) : (
          <span className="font-sans text-sm text-[var(--mk-text-muted)]">{seller.name}</span>
        )}
        <Link href="/" className="inline-flex items-center gap-1.5 font-display text-sm text-[var(--mk-text-muted)]">
          <LogoMark size={14} mono on="auto" /> Kitevo
        </Link>
      </header>
      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-10 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:py-16">
        <div className="min-w-0">
          {product.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- base64 cover
            <img src={product.coverUrl} alt="" className="mb-8 aspect-[4/3] w-full rounded-2xl object-cover" />
          )}
          <p className="font-sans text-sm text-[var(--mk-text-muted)]">{paid ? "From" : "Free download from"} {seller.name}</p>
          <h1 className="mt-2 text-balance font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.08] tracking-tight">{product.title || "Untitled"}</h1>
          {product.description && (
            <div className="mt-6 max-w-prose whitespace-pre-line font-sans text-base leading-relaxed text-[var(--mk-text-muted)]">{product.description}</div>
          )}
        </div>
        <aside className="md:sticky md:top-8 md:self-start">
          <p className="mb-3 font-display text-2xl font-semibold">{price}</p>
          {paid && !onSale && !draft ? (
            <div className="rounded-2xl bg-[var(--mk-surface)] p-6 font-sans text-sm text-[var(--mk-text-muted)]">
              This product isn&apos;t on sale right now. Check back later.
            </div>
          ) : (
            <ClaimForm
              productId={product.id}
              creatorName={seller.name}
              preview={draft}
              priceLabel={paid ? price : undefined}
              providers={providers.length ? providers : undefined}
              notice={checkout ? CHECKOUT_NOTICES[checkout] : undefined}
            />
          )}
        </aside>
      </main>
      <footer className="pb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 font-sans text-xs text-[var(--mk-text-soft)] hover:text-[var(--mk-text)]">
          <LogoMark size={13} mono on="auto" /> Made with <span className="font-semibold">Kitevo</span>
        </Link>
      </footer>
    </div>
  );
}
