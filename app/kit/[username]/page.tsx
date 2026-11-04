import { notFound } from "next/navigation";
import { publicBooking } from "@/lib/kit-booking";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStatsForCreator, getEnabledPlatformIds } from "@/lib/platforms";
import {
  MOCK_CREATOR,
  MOCK_LINKS,
  MOCK_RATES,
  MOCK_BRANDS,
  MOCK_POSTS,
} from "@/lib/mock-data";
import { composeKitStats } from "@/lib/kit-stats-compose";
import { loadKitViewData } from "@/lib/kit-view-data";
import { getKitBySlug } from "@/lib/get-kit-by-slug";
import { recordKitView } from "@/lib/kit-views";
import { MediaKitClient } from "./MediaKitClient";
import { PasswordWall } from "./PasswordWall";
import { DEFAULT_KIT_APPEARANCE } from "@/lib/kit-appearance";
import { cookies } from "next/headers";
import { APP_URL } from "@/lib/app-url";
import { trackKitFirstView } from "@/lib/analytics";

const DEMO_SLUGS = ["demo", "alexchen", "my-kit"];

const BASE_URL = APP_URL.replace(/\/$/, "");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const slug = username ?? "demo";

  try {
    const result = await getKitBySlug(slug);
    if (!result) return { title: "Media Kit — Kitevo" };

    const { creator, kit } = result;
    const title = `${creator.name} — Media Kit`;
    const description = creator.bio
      ? creator.bio.slice(0, 155)
      : `View ${creator.name}'s professional media kit powered by Kitevo.`;
    const url = `${BASE_URL}/kit/${slug}`;

    // og:image / twitter:image come from the co-located opengraph-image.tsx
    // (the branded "Start collaborating with <name>" card). Do not set `images`
    // here — an explicit value would override the generated card.
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: "Kitevo",
        type: "profile",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      alternates: { canonical: url },
    };
  } catch {
    return { title: "Media Kit — Kitevo" };
  }
}

/** Pre-render these at build time; other slugs render on demand (web server). */
export async function generateStaticParams() {
  return [
    { username: "demo" },
    { username: "alexchen" },
    { username: "my-kit" },
  ];
}

/** Allow any kit slug; unlisted ones are server-rendered on first request. */
export const dynamicParams = true;

/** Always fetch fresh data — Instagram/YouTube media URLs expire and change. */
export const revalidate = 0;

/** Server component: loads kit from DB by slug, or mock for demo slugs; passes to client. */
export default async function MediaKitPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const [{ username }, sp] = await Promise.all([params, searchParams]);
  const slug = username ?? "demo";
  const previewMode = sp?.preview === "1";

  let result: Awaited<ReturnType<typeof getKitBySlug>> = null;
  try {
    result = await getKitBySlug(slug);
  } catch (e) {
    // Build or runtime without DB (e.g. DATABASE_URL not set): use mock for demo slugs
    if (!DEMO_SLUGS.includes(slug)) throw e;
  }

  if (result) {
    // Password check — skip for kit owner (preview mode or logged in)
    if (result.kit.passwordHash) {
      const cookieStore = await cookies();
      const unlockCookie = cookieStore.get(`kit_unlock_${result.kit.id}`)?.value;
      const session = await getServerSession(authOptions);
      const isOwner = session?.user?.id === result.kit.userId;
      if (!isOwner && unlockCookie !== result.kit.passwordHash) {
        return (
          <PasswordWall
            kitId={result.kit.id}
            kitName={result.kit.name}
            creatorName={result.creator.name}
            avatarUrl={result.creator.avatarUrl}
          />
        );
      }
    }

    const [referrer, session] = await Promise.all([
      headers().then((h) => h.get("referer") ?? undefined),
      getServerSession(authOptions),
    ]);
    if (!previewMode) {
      try {
        await recordKitView(result.kit.id, referrer);
      } catch {
        /* KitView migration not applied yet — page must still render */
      }
    }
    const isOwner = session?.user?.id === result.kit.userId;
    // Activation signal: the first time anyone other than the owner opens this kit.
    if (!previewMode && !isOwner) await trackKitFirstView(result.kit.id, result.kit.userId);
    // Plan, live stats, posts, inquiry form and referral code (shared with the editor preview).
    const view = await loadKitViewData(result.kit.userId);
    const { platformStats, enabledPlatformIds, statsSource } = composeKitStats(result.kit.manualStats, view.live);
    const { instagramConnected, instagramPosts, inquiryEnabled, referralCode, products } = view;
    return (
      <MediaKitClient
        username={result.creator.username}
        creator={{
          name: result.creator.name,
          username: result.creator.username,
          bio: result.creator.bio,
          avatarUrl: result.creator.avatarUrl,
          verifiedTier: result.creator.verifiedTier,
          niches: result.creator.niches,
          location: result.creator.location,
        }}
        links={result.creator.links}
        platformStats={platformStats}
        enabledPlatformIds={enabledPlatformIds}
        rates={result.kit.rates}
        brands={result.kit.brands}
        sectionVisibility={result.kit.sectionVisibility}
        appearance={result.kit.appearance}
        instagramConnected={instagramConnected}
        instagramPosts={instagramPosts}
        statsSource={statsSource}
        kitId={result.kit.id}
        inquiryEnabled={inquiryEnabled}
        isOwner={isOwner && !previewMode}
        referralCode={referralCode}
        products={products}
        booking={publicBooking(result.kit.booking, view.schedulers)}
      />
    );
  }

  if (DEMO_SLUGS.includes(slug)) {
    // avatarUrl was omitted here, so the demo fell back to an initial even once the
    // avatar file existed. niches/location give the hero the same shape a real kit has.
    const creator = {
      name: MOCK_CREATOR.name,
      username: MOCK_CREATOR.username,
      bio: MOCK_CREATOR.bio,
      avatarUrl: MOCK_CREATOR.avatar,
      niches: ["Fashion", "Lifestyle", "Travel"],
      location: "Los Angeles, CA",
    };
    const [platformStats, enabledPlatformIds] = await Promise.all([
      getStatsForCreator({ instagram: creator.username }),
      Promise.resolve(getEnabledPlatformIds()),
    ]);
    return (
      <MediaKitClient
        username={slug}
        creator={creator}
        links={MOCK_LINKS}
        platformStats={platformStats}
        enabledPlatformIds={enabledPlatformIds}
        rates={MOCK_RATES}
        brands={MOCK_BRANDS}
        instagramPosts={MOCK_POSTS}
        appearance={DEFAULT_KIT_APPEARANCE}
        isDemoKit
      />
    );
  }

  notFound();
}
