"use client";

import { useMemo } from "react";
import { MediaKitClient } from "@/app/kit/[username]/MediaKitClient";
import { composeKitStats, type LiveKitStats } from "@/lib/kit-stats-compose";
import type { FetchedPost } from "@/lib/platforms/instagram";
import { normalizeLinks } from "@/lib/profile-links";
import type { KitDraft } from "./KitEditor";
import type { PublicProduct } from "@/lib/commerce-shared";

/** Response of GET /api/kits/[id]/preview: the non-editable half of the kit. */
export type KitPreviewData = {
  kitId: string;
  username: string;
  creator: {
    name: string;
    username: string;
    bio: string;
    avatarUrl: string | null;
    verifiedTier: string | null;
    niches: string[];
    location: string | null;
  };
  links: { label: string; url: string }[];
  live: LiveKitStats;
  instagramConnected: boolean;
  instagramPosts: FetchedPost[];
  inquiryEnabled: boolean;
  referralCode: string | null;
  products: PublicProduct[];
};

/**
 * The real public kit component, rendered from the server's view data plus the editor's
 * unsaved draft — so the preview changes as the creator types. Stats are composed with the
 * same rules as the public page (composeKitStats), so "self-reported" vs "live" labels match.
 */
export function LiveKit({ data, draft }: { data: KitPreviewData; draft: KitDraft }) {
  const stats = useMemo(() => composeKitStats(draft.manualStats, data.live), [draft.manualStats, data.live]);
  // The shared profile is edited in the same editor, so the preview shows the unsaved version.
  const p = draft.profile;
  const creator = useMemo(
    () => ({
      ...data.creator,
      name: p.name.trim() || data.creator.name,
      bio: p.bio,
      location: p.location.trim() || null,
      niches: p.niches,
      avatarUrl: p.avatarUrl,
    }),
    [data.creator, p.name, p.bio, p.location, p.niches, p.avatarUrl],
  );
  // Same check the server applies, so an address that won't save doesn't show either.
  const links = useMemo(() => normalizeLinks(p.links), [p.links]);
  return (
    <MediaKitClient
      embedded
      username={data.username}
      referralCode={data.referralCode}
      products={data.products}
      creator={creator}
      links={links}
      platformStats={stats.platformStats}
      enabledPlatformIds={stats.enabledPlatformIds}
      statsSource={stats.statsSource}
      rates={draft.rates}
      brands={draft.brands}
      // The rate card's visibility is controlled by the Rates switch only (as on save).
      sectionVisibility={{ ...draft.sectionVisibility, rates: draft.rates.show }}
      appearance={draft.appearance}
      instagramConnected={data.instagramConnected}
      instagramPosts={data.instagramPosts}
      kitId={data.kitId}
      inquiryEnabled={data.inquiryEnabled}
    />
  );
}
