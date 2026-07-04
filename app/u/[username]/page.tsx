import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { MarketingNav } from "@/app/components/landing/MarketingNav";

type Params = { username: string };

async function getCreator(username: string) {
  return prisma.user.findFirst({
    where: {
      username,
      accountType: "creator",
    },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      avatarUrl: true,
      location: true,
      niches: true,
      openToCollab: true,
      verifiedTier: true,
      kits: {
        select: { id: true, slug: true, name: true },
        take: 1,
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { username } = await params;
  const creator = await getCreator(username);
  if (!creator) return { title: "Creator not found" };

  const displayName = creator.name ?? `@${creator.username}`;
  const niches: string[] = creator.niches ? JSON.parse(creator.niches) : [];
  const description = creator.bio ?? `${displayName} is a creator on Kitevo${niches.length ? ` in ${niches.slice(0, 2).join(" & ")}` : ""}.`;

  return {
    title: `${displayName} — Kitevo`,
    description,
    openGraph: {
      title: `${displayName} on Kitevo`,
      description,
      images: creator.avatarUrl ? [{ url: creator.avatarUrl, width: 400, height: 400 }] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${displayName} on Kitevo`,
      description,
      images: creator.avatarUrl ? [creator.avatarUrl] : [],
    },
  };
}

export default async function CreatorProfilePage({ params }: { params: Promise<Params> }) {
  const { username } = await params;
  const creator = await getCreator(username);
  if (!creator) notFound();

  const niches: string[] = creator.niches ? JSON.parse(creator.niches) : [];
  const displayName = creator.name ?? `@${creator.username}`;
  const kit = creator.kits[0];

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      <main className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-8">
        {/* Profile header */}
        <div className="flex items-start gap-5">
          <div className="h-20 w-20 shrink-0 rounded-2xl overflow-hidden bg-muted border border-border">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">{displayName}</h1>
              <VerifiedBadge tier={creator.verifiedTier} size="md" />
            </div>
            {creator.username && (
              <p className="text-sm text-muted-foreground mt-0.5">@{creator.username}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {creator.location && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {creator.location}
                </span>
              )}
              {creator.openToCollab && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Open to collabs
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {creator.bio && (
          <p className="mt-6 text-sm text-foreground leading-relaxed">{creator.bio}</p>
        )}

        {/* Niches */}
        {niches.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {niches.map((n) => (
              <span key={n} className="text-xs font-medium bg-muted text-foreground px-3 py-1.5 rounded-full border border-border">
                {n}
              </span>
            ))}
          </div>
        )}

        <div className="border-t border-border my-8" />

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {kit && (
            <Link
              href={`/kit/${kit.slug}`}
              className="inline-flex h-11 items-center justify-center rounded-full bg-foreground text-background px-6 text-sm font-semibold hover:opacity-80 transition-opacity"
            >
              View media kit
            </Link>
          )}
          <Link
            href={`/brand/inbox?message=${creator.id}`}
            className="inline-flex h-11 items-center justify-center rounded-full border border-border text-foreground px-6 text-sm font-medium hover:bg-muted transition-colors"
          >
            Send a message
          </Link>
        </div>
      </main>
    </div>
  );
}
