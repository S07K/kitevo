import { notFound } from "next/navigation";
import { getStatsForCreator, getEnabledPlatformIds } from "@/lib/platforms";
import { getStatsForUser } from "@/lib/instagram-api";
import {
  MOCK_CREATOR,
  MOCK_LINKS,
  MOCK_WORK_SAMPLES,
  MOCK_RATES,
  MOCK_BRANDS,
} from "@/lib/mock-data";
import { getKitBySlug } from "@/lib/get-kit-by-slug";
import { MediaKitClient } from "./MediaKitClient";

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

  const result = await getKitBySlug(slug);

  if (result) {
    const [instagramStats, enabledPlatformIds] = await Promise.all([
      getStatsForUser(result.kit.userId),
      Promise.resolve(getEnabledPlatformIds()),
    ]);
    const platformStats = { instagram: instagramStats };
    return (
      <MediaKitClient
        username={result.creator.username}
        creator={{ name: result.creator.name, username: result.creator.username, bio: result.creator.bio }}
        links={result.creator.links}
        platformStats={platformStats}
        enabledPlatformIds={enabledPlatformIds}
        workSamples={result.kit.workSamples}
        rates={result.kit.rates}
        brands={result.kit.brands}
        sectionVisibility={result.kit.sectionVisibility}
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
      />
    );
  }

  notFound();
}
