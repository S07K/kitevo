import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canUseCustomDomain } from "@/lib/custom-domains";
import { APP_ORIGIN } from "@/lib/custom-domain-host";
import MediaKitPage, { generateMetadata as kitMetadata } from "@/app/kit/[username]/page";

/**
 * A kit served on its creator's own domain. middleware.ts rewrites "/" on any non-Kitevo
 * host here (and 404s this route on Kitevo's own hosts), so the browser keeps showing the
 * creator's domain. Renders the exact public kit page.
 */
export const dynamic = "force-dynamic";

async function lookup(rawHost: string) {
  const hostname = decodeURIComponent(rawHost).toLowerCase();
  const row = await prisma.customDomain.findUnique({
    where: { hostname },
    select: { id: true, hostname: true, status: true, userId: true, kit: { select: { slug: true } } },
  });
  return row;
}

export async function generateMetadata({ params }: { params: Promise<{ host: string }> }): Promise<Metadata> {
  const { host } = await params;
  const row = await lookup(host);
  if (!row) return { title: "Kitevo" };
  const base = await kitMetadata({ params: Promise.resolve({ username: row.kit.slug }) });
  const url = `https://${row.hostname}/`;
  // The share card is generated on Kitevo's domain for the kit's slug.
  const image = `${APP_ORIGIN}/kit/${row.kit.slug}/opengraph-image`;
  return {
    ...base,
    openGraph: { ...base.openGraph, url, images: [image] },
    twitter: { ...base.twitter, images: [image] },
    alternates: { canonical: url },
  };
}

export default async function CustomDomainKitPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const row = await lookup(host);
  if (!row) notFound();

  // A lapsed plan pauses the domain: visitors land on the kit's Kitevo URL instead.
  if (!(await canUseCustomDomain(row.userId))) redirect(`${APP_ORIGIN}/kit/${row.kit.slug}`);

  // Traffic reaching us on this host means DNS and HTTPS work; mark it live without waiting
  // for the creator to press "Check".
  if (row.status !== "active") {
    const proto = (await headers()).get("x-forwarded-proto");
    if (proto !== "http") {
      await prisma.customDomain
        .update({ where: { id: row.id }, data: { status: "active", verified: true, dnsConfigured: true, tlsReady: true, lastError: null, activatedAt: new Date() } })
        .catch(() => {});
    }
  }

  return MediaKitPage({ params: Promise.resolve({ username: row.kit.slug }), searchParams: Promise.resolve({}) });
}
