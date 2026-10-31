import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/kit-storage";
import type { SectionVisibility } from "@/lib/kit-storage";
import type { WorkSample, KitRates, BrandPartner } from "@/lib/mock-data";
import { parseKitAppearance } from "@/lib/kit-appearance";
import { parseManualStats } from "@/lib/manual-stats";

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
        typeof x === "object" && x !== null && typeof (x as { label: string }).label === "string" && typeof (x as { url: string }).url === "string"
    );
  } catch {
    return [];
  }
}

/** GET /api/kits/by-slug/[slug] — public: kit + creator profile by slug (no auth) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const kit = await prisma.kit.findFirst({
    where: { slug },
    include: { user: { select: { name: true, username: true, bio: true, avatarUrl: true, links: true, email: true } } },
  });
  if (!kit) {
    return NextResponse.json({ error: "Kit not found" }, { status: 404 });
  }

  const creator = {
    name: kit.user.name ?? "Creator",
    username: kit.user.username ?? kit.slug,
    bio: kit.user.bio ?? "",
    avatarUrl: kit.user.avatarUrl ?? undefined,
    email: kit.user.email,
    links: parseLinks(kit.user.links),
  };

  const sectionVisibility = parseJson<SectionVisibility>(kit.sectionVisibility, { ...DEFAULT_SECTION_VISIBILITY });

  return NextResponse.json({
    kit: {
      id: kit.id,
      slug: kit.slug,
      name: kit.name,
      workSamples: parseJson<WorkSample[]>(kit.workSamples, []),
      rates: parseJson<KitRates>(kit.rates, { show: false }),
      brands: parseJson<BrandPartner[]>(kit.brands, []),
      sectionVisibility,
      appearance: parseKitAppearance(kit.appearance),
      manualStats: parseManualStats(kit.manualStats),
    },
    creator,
  });
}
