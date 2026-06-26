import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { KitPdf } from "@/lib/kit-pdf";
import { getPdfTheme } from "@/lib/pdf-theme";
import { parseKitAppearance } from "@/lib/kit-appearance";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/kit-storage";
import { getStatsForUser } from "@/lib/instagram-api";
import type { WorkSample, KitRates, BrandPartner } from "@/lib/mock-data";
import type { SectionVisibility } from "@/lib/kit-storage";

function parseJson<T>(raw: string, fallback: T): T {
  try { return (JSON.parse(raw) ?? fallback) as T; }
  catch { return fallback; }
}

/** GET /api/kits/[id]/export — generate and stream a PDF for a kit */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [kit, user] = await Promise.all([
    prisma.kit.findFirst({
      where: { id, userId: session.user.id },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, username: true, bio: true, links: true },
    }),
  ]);

  if (!kit || !user) {
    return NextResponse.json({ error: "Kit not found" }, { status: 404 });
  }

  const appearance = parseKitAppearance(kit.appearance);
  const theme = getPdfTheme(appearance.preset);
  const workSamples = parseJson<WorkSample[]>(kit.workSamples, []);
  const rates = parseJson<KitRates>(kit.rates, { show: false });
  const brands = parseJson<BrandPartner[]>(kit.brands, []);
  const sectionVisibility = parseJson<SectionVisibility>(
    kit.sectionVisibility,
    { ...DEFAULT_SECTION_VISIBILITY }
  );
  const links = parseJson<{ label: string; url: string }[]>(user.links ?? "[]", []);

  // Fetch live Instagram stats (non-fatal if unavailable)
  let stats: { followers: number; avgEngagement: number; growthThisMonth: number; platform: string } | null = null;
  try {
    const igStats = await getStatsForUser(session.user.id);
    if (igStats.followers > 0) {
      stats = {
        followers: igStats.followers,
        avgEngagement: igStats.avgEngagement,
        growthThisMonth: igStats.growthThisMonth,
        platform: "instagram",
      };
    }
  } catch {
    // Stats unavailable — PDF renders without them
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mediakitpro.com";

  const pdf = await renderToBuffer(
    // @ts-expect-error react-pdf types diverge from React 19 createElement signature
    React.createElement(KitPdf, {
      creator: {
        name: user.name ?? "Creator",
        username: user.username ?? "",
        bio: user.bio ?? undefined,
      },
      kitName: kit.name,
      appUrl,
      workSamples,
      rates,
      brands,
      links,
      stats,
      theme,
      sectionVisibility: sectionVisibility as unknown as Record<string, boolean>,
    })
  );

  const filename = `${(user.username ?? "media-kit").replace(/[^a-z0-9-]/gi, "-")}-media-kit.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.byteLength),
    },
  });
}
