import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllowedKitsForUser } from "@/lib/subscription-for-request";
import { getViewCountsForKits } from "@/lib/kit-views";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/kit-storage";
import type { SectionVisibility } from "@/lib/kit-storage";
import type { WorkSample, BrandPartner } from "@/lib/mock-data";
import { parseKitAppearance } from "@/lib/kit-appearance";
import { parseManualStats } from "@/lib/manual-stats";
import { trackEvent } from "@/lib/analytics";import { normalizeRates } from "@/lib/kit-rates";


function defaultVisibility(): SectionVisibility {
  return { ...DEFAULT_SECTION_VISIBILITY };
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/** GET /api/kits — list current user's kits */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const kits = await prisma.kit.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });
  const viewCounts = await getViewCountsForKits(kits.map((k) => k.id));
  const list = kits.map((k) => ({
    id: k.id,
    slug: k.slug,
    name: k.name,
    hasPassword: !!k.passwordHash,
    workSamples: parseJson<WorkSample[]>(k.workSamples, []),
    rates: normalizeRates(parseJson<unknown>(k.rates, null)),
    brands: parseJson<BrandPartner[]>(k.brands, []),
    sectionVisibility: parseJson<SectionVisibility>(k.sectionVisibility, defaultVisibility()),
    appearance: parseKitAppearance(k.appearance),
    manualStats: parseManualStats(k.manualStats),
    viewCount: viewCounts[k.id] ?? 0,
  }));
  return NextResponse.json(list);
}

/** POST /api/kits — create kit (slug, name). Enforces subscription limit. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase().replace(/\s+/g, "-") : "";
  const name = typeof body.name === "string" ? body.name.trim() || "Untitled Kit" : "Untitled Kit";
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const allowedKits = await getAllowedKitsForUser(session.user.id);
  const count = await prisma.kit.count({ where: { userId: session.user.id } });
  if (count >= allowedKits) {
    return NextResponse.json(
      { error: `Kit limit reached (${allowedKits}). Upgrade your plan for more.` },
      { status: 403 }
    );
  }

  const existingSlug = await prisma.kit.findFirst({ where: { slug } });
  if (existingSlug) {
    return NextResponse.json({ error: "This URL slug is already taken" }, { status: 409 });
  }

  const defaultRates = JSON.stringify({ show: false });
  const sectionVisibilityJson = JSON.stringify(DEFAULT_SECTION_VISIBILITY);
  const kit = await prisma.kit.create({
    data: {
      userId: session.user.id,
      slug,
      name,
      workSamples: "[]",
      rates: defaultRates,
      brands: "[]",
      sectionVisibility: sectionVisibilityJson,
    },
  });
  await trackEvent("kit_created", { userId: session.user.id, props: { kitId: kit.id, kitNumber: count + 1 } });

  return NextResponse.json({
    id: kit.id,
    slug: kit.slug,
    name: kit.name,
    workSamples: [],
    rates: { show: false },
    brands: [],
    sectionVisibility: defaultVisibility(),
    appearance: parseKitAppearance(kit.appearance),
    manualStats: {},
  });
}
