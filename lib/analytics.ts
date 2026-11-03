/**
 * First-party product funnel analytics.
 *
 * Server-side events in the AnalyticsEvent table — the source of truth for activation and
 * conversion (GA4 stays for page traffic). Event names are a closed set so the funnel can't
 * drift through typos; props are small JSON objects and must never carry PII or tokens.
 *
 * trackEvent never throws and never blocks a user action on analytics failing.
 */

import { prisma } from "@/lib/prisma";

export const ANALYTICS_EVENTS = [
  "signup", //               props: { method: "email" | "google" }
  "onboarding_complete",
  "kit_created", //          props: { kitId, kitNumber }
  "kit_first_view", //       first view of a kit by someone other than its owner (≈ "shared")
  "checkout_started", //     props: { tier, interval, trial, code (booleans) }
  "upgrade", //              props: { tier }
  "subscription_canceled",
  "product_published", //    props: { productId }
  "product_claimed", //      a new free claim (no buyer PII in props)
  "product_purchased", //    a paid order confirmed; props: { productId, provider }
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

type Props = Record<string, string | number | boolean | null>;

export async function trackEvent(
  name: AnalyticsEventName,
  opts: { userId?: string | null; props?: Props; dedupeKey?: string } = {}
): Promise<void> {
  const data = {
    name,
    userId: opts.userId ?? null,
    props: opts.props ? JSON.stringify(opts.props) : null,
    dedupeKey: opts.dedupeKey ?? null,
  };
  try {
    // A repeat dedupeKey means the "first time" already happened — skip it quietly
    // (createMany + skipDuplicates = ON CONFLICT DO NOTHING, no error logged).
    if (data.dedupeKey) await prisma.analyticsEvent.createMany({ data: [data], skipDuplicates: true });
    else await prisma.analyticsEvent.create({ data });
  } catch (e) {
    if (process.env.NODE_ENV !== "test") console.warn(`[analytics] ${name} not recorded:`, e);
  }
}

// Kits whose first outside view this process has already recorded (or seen recorded).
// Saves a write per kit view; the unique dedupeKey is the real guarantee across instances.
const firstViewSeen = new Set<string>();

/** Record a kit's first view by someone other than its owner. Cheap to call on every view. */
export async function trackKitFirstView(kitId: string, ownerId: string): Promise<void> {
  if (firstViewSeen.has(kitId)) return;
  firstViewSeen.add(kitId);
  await trackEvent("kit_first_view", { userId: ownerId, props: { kitId }, dedupeKey: `kit_first_view:${kitId}` });
}

/** Test hook. */
export function _resetFirstViewCache() {
  firstViewSeen.clear();
}

export const FUNNEL_STEPS = [
  { event: "signup", label: "Signed up" },
  { event: "onboarding_complete", label: "Finished onboarding" },
  { event: "kit_created", label: "Created a kit" },
  { event: "kit_first_view", label: "Kit viewed by someone else" },
  { event: "checkout_started", label: "Started checkout" },
  { event: "upgrade", label: "Upgraded" },
] as const satisfies ReadonlyArray<{ event: AnalyticsEventName; label: string }>;

export type FunnelRow = { event: AnalyticsEventName; label: string; users: number; pctOfSignups: number | null };

/**
 * Cohort funnel: of the users who signed up in [since, until), how many reached each step
 * (at any time since). Counts distinct users, so repeat events don't inflate a step.
 */
export async function getFunnel(since: Date, until: Date = new Date()): Promise<{ rows: FunnelRow[]; canceled: number }> {
  const cohort = await prisma.analyticsEvent.findMany({
    where: { name: "signup", createdAt: { gte: since, lt: until }, userId: { not: null } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const ids = cohort.map((c) => c.userId!) ;
  const signups = ids.length;

  const reached = async (event: AnalyticsEventName) =>
    event === "signup"
      ? signups
      : ids.length === 0
        ? 0
        : (
            await prisma.analyticsEvent.findMany({
              where: { name: event, userId: { in: ids } },
              select: { userId: true },
              distinct: ["userId"],
            })
          ).length;

  const rows: FunnelRow[] = [];
  for (const step of FUNNEL_STEPS) {
    const users = await reached(step.event);
    rows.push({ ...step, users, pctOfSignups: signups ? Math.round((users / signups) * 1000) / 10 : null });
  }
  const canceled = await reached("subscription_canceled");
  return { rows, canceled };
}
