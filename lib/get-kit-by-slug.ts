/**
 * Server-only: get kit and creator by slug for public kit page.
 * Same shape as GET /api/kits/by-slug/[slug].
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/kit-storage";
import type { SectionVisibility } from "@/lib/kit-storage";
import type { WorkSample, KitRates, BrandPartner } from "@/lib/mock-data";
import { parseKitAppearance, type KitAppearance } from "@/lib/kit-appearance";

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function parseLinks(linksJson: string | null): { label: string; url: string }[] {
  if (!linksJson) return [];
  try {
    const parsed = JSON.parse(linksJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is { label: string; url: string } =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as { label: string }).label === "string" &&
        typeof (x as { url: string }).url === "string"
    );
  } catch {
    return [];
  }
}

export type PublicKit = {
  id: string;
  userId: string;
  slug: string;
  name: string;
  passwordHash: string | null;
  workSamples: WorkSample[];
  rates: KitRates;
  brands: BrandPartner[];
  sectionVisibility: SectionVisibility;
  appearance: KitAppearance;
};

export type PublicCreator = {
  name: string;
  username: string;
  bio: string;
  avatarUrl?: string;
  verifiedTier?: string | null;
  links: { label: string; url: string }[];
};

export type KitBySlugResult = { kit: PublicKit; creator: PublicCreator } | null;

export async function getKitBySlug(slug: string): Promise<KitBySlugResult> {
  const kit = await prisma.kit.findFirst({
    where: { slug },
    include: {
      user: {
        select: { name: true, username: true, bio: true, avatarUrl: true, verifiedTier: true, links: true },
      },
    },
  });
  if (!kit) return null;

  const creator: PublicCreator = {
    name: kit.user.name ?? "Creator",
    username: kit.user.username ?? kit.slug,
    bio: kit.user.bio ?? "",
    avatarUrl: kit.user.avatarUrl ?? undefined,
    verifiedTier: kit.user.verifiedTier ?? null,
    links: parseLinks(kit.user.links),
  };

  const sectionVisibility = parseJson<SectionVisibility>(
    kit.sectionVisibility,
    { ...DEFAULT_SECTION_VISIBILITY }
  );

  return {
    kit: {
      id: kit.id,
      userId: kit.userId,
      slug: kit.slug,
      name: kit.name,
      passwordHash: kit.passwordHash ?? null,
      workSamples: parseJson<WorkSample[]>(kit.workSamples, []),
      rates: parseJson<KitRates>(kit.rates, { show: false }),
      brands: parseJson<BrandPartner[]>(kit.brands, []),
      sectionVisibility,
      appearance: parseKitAppearance(kit.appearance),
    },
    creator,
  };
}
