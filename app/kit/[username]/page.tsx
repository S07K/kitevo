import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStatsForCreator, getEnabledPlatformIds } from "@/lib/platforms";
import { getStatsForUser } from "@/lib/instagram-api";
import {
  MOCK_CREATOR,
  MOCK_LINKS,
  MOCK_WORK_SAMPLES,
  MOCK_RATES,
  MOCK_BRANDS,
} from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getTierByPriceId } from "@/config/subscriptions";
import { getKitBySlug } from "@/lib/get-kit-by-slug";
import { recordKitView } from "@/lib/kit-views";
import { MediaKitClient } from "./MediaKitClient";
import { DEFAULT_KIT_APPEARANCE } from "@/lib/kit-appearance";

const DEMO_SLUGS = ["demo", "alexchen", "my-kit"];

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

/** Server component: loads kit from DB by slug, or mock for demo slugs; passes to client. */
export default async function MediaKitPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const slug = username ?? "demo";

  let result: Awaited<ReturnType<typeof getKitBySlug>> = null;
  try {
    result = await getKitBySlug(slug);
  } catch (e) {
    // Build or runtime without DB (e.g. DATABASE_URL not set): use mock for demo slugs
    if (!DEMO_SLUGS.includes(slug)) throw e;
  }

  if (result) {
    const [referrer, session] = await Promise.all([
      headers().then((h) => h.get("referer") ?? undefined),
      getServerSession(authOptions),
    ]);
    try {
      await recordKitView(result.kit.id, referrer);
    } catch {
      /* KitView migration not applied yet — page must still render */
    }
    const isOwner = session?.user?.id === result.kit.userId;
    const [instagramStats, enabledPlatformIds, user] = await Promise.all([
      getStatsForUser(result.kit.userId),
      Promise.resolve(getEnabledPlatformIds()),
      prisma.user.findUnique({
        where: { id: result.kit.userId },
        select: { instagramUserId: true, stripeCustomerId: true },
      }),
    ]);

    let inquiryEnabled = false;
    if (user?.stripeCustomerId) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "active",
          limit: 1,
        });
        const priceId = subs.data[0]?.items?.data?.[0]?.price?.id ?? null;
        const tier = getTierByPriceId(priceId);
        inquiryEnabled = tier?.id === "pro";
      } catch {
        // Stripe unavailable — degrade gracefully
      }
    }

    const platformStats = { instagram: instagramStats };
    const instagramConnected = !!user?.instagramUserId;
    return (
      <MediaKitClient
        username={result.creator.username}
        creator={{
          name: result.creator.name,
          username: result.creator.username,
          bio: result.creator.bio,
          avatarUrl: result.creator.avatarUrl,
        }}
        links={result.creator.links}
        platformStats={platformStats}
        enabledPlatformIds={enabledPlatformIds}
        workSamples={result.kit.workSamples}
        rates={result.kit.rates}
        brands={result.kit.brands}
        sectionVisibility={result.kit.sectionVisibility}
        appearance={result.kit.appearance}
        instagramConnected={instagramConnected}
        kitId={result.kit.id}
        inquiryEnabled={inquiryEnabled}
        isOwner={isOwner}
      />
    );
  }

  if (DEMO_SLUGS.includes(slug)) {
    const creator = { name: MOCK_CREATOR.name, username: MOCK_CREATOR.username, bio: MOCK_CREATOR.bio };
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
        workSamples={MOCK_WORK_SAMPLES}
        rates={MOCK_RATES}
        brands={MOCK_BRANDS}
        appearance={DEFAULT_KIT_APPEARANCE}
        isDemoKit
      />
    );
  }

  notFound();
}
