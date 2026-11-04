import { prisma } from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { getTierById, getTierByPriceId } from "@/config/subscriptions";
import { getStatsForUser, getRecentPostsForUser } from "@/lib/instagram-api";
import { ensureReferralCode } from "@/lib/referrals";
import { connectedSchedulers, publishedProductsFor, type PublicProduct } from "@/lib/commerce";
import type { LiveKitStats } from "@/lib/kit-stats-compose";

export type KitViewData = {
  live: LiveKitStats;
  instagramConnected: boolean;
  instagramPosts: Awaited<ReturnType<typeof getRecentPostsForUser>>;
  inquiryEnabled: boolean;
  referralCode: string | null;
  /** Published products for the kit's Shop section (never delivery links). */
  products: PublicProduct[];
  /** Schedulers connected in Connectors; a kit's "Book a call" shows only on one of these. */
  schedulers: string[];
};

/**
 * Everything the public kit needs beyond the kit row itself: the owner's effective plan,
 * live platform stats (Starter+), recent posts, whether the Pro inquiry form shows, and the
 * referral code on "Create yours". Shared by the public kit page and the editor's live
 * preview so the two can never disagree.
 */
export async function loadKitViewData(ownerId: string): Promise<KitViewData> {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { instagramUserId: true, instagramAccessToken: true, stripeCustomerId: true, compedTier: true, youtubeChannelId: true, youtubeAccessToken: true, referralCode: true },
  });

  // Effective plan: an active subscription wins over a comp, matching /api/subscription-status.
  // Live platform data is a Starter+ feature; free kits render only creator-reported stats.
  let creatorTier = getTierById(user?.compedTier ?? null);
  if (user?.stripeCustomerId) {
    try {
      const sub = await payments.getSubscription(user.stripeCustomerId, { activeOnly: true });
      const subscriptionTier = getTierByPriceId(sub?.priceId ?? null);
      if (subscriptionTier) creatorTier = subscriptionTier;
    } catch (e) {
      console.error("[kit view] subscription lookup failed:", e);
    }
  }
  const hasPaidPlan = !!creatorTier && creatorTier.id !== "free";
  const inquiryEnabled = creatorTier?.id === "pro";

  const instagramConnected = !!(user?.instagramUserId && user?.instagramAccessToken);
  const live: LiveKitStats = {};
  let instagramPosts: KitViewData["instagramPosts"] = [];
  if (hasPaidPlan && instagramConnected) {
    try {
      const [stats, posts] = await Promise.all([getStatsForUser(ownerId), getRecentPostsForUser(ownerId)]);
      if (stats) live.instagram = stats;
      instagramPosts = posts;
    } catch (e) {
      console.error("[kit view] Instagram fetch failed:", e);
    }
  }

  const youtubeConnected = !!(user?.youtubeChannelId && user?.youtubeAccessToken);
  if (hasPaidPlan && youtubeConnected) {
    try {
      const { getYouTubeStatsForUser } = await import("@/lib/youtube-api");
      const yt = await getYouTubeStatsForUser(ownerId);
      if (yt) {
        live.youtube = {
          followers: yt.subscriberCount,
          avgEngagement: 0,
          growthThisMonth: 0,
          extra: { videoCount: yt.videoCount, totalViews: yt.viewCount, recentVideosJson: JSON.stringify(yt.recentVideos) },
        };
      }
    } catch (e) {
      console.error("[kit view] getYouTubeStatsForUser failed:", e);
    }
  }

  // Codes are created lazily, once per user.
  const referralCode = user?.referralCode ?? (await ensureReferralCode(ownerId).catch(() => null));

  const [products, schedulers] = await Promise.all([publishedProductsFor(ownerId).catch(() => []), connectedSchedulers(ownerId).catch(() => [])]);
  return { live, instagramConnected, instagramPosts, inquiryEnabled, referralCode, products, schedulers };
}
