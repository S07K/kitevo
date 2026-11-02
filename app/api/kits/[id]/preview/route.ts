import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getKitBySlug } from "@/lib/get-kit-by-slug";
import { loadKitViewData } from "@/lib/kit-view-data";

export const dynamic = "force-dynamic";

/**
 * GET /api/kits/[id]/preview — what the editor needs to render the real kit component live:
 * the creator block, links, and the same plan-dependent data the public page loads (live
 * stats, posts, inquiry form, referral code). Owner only. The editable parts (style, rates,
 * brands, sections, manual stats) come from the editor's draft, not from here.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const row = await prisma.kit.findFirst({ where: { id, userId: session.user.id }, select: { slug: true } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await getKitBySlug(row.slug);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const view = await loadKitViewData(result.kit.userId);
  const { creator } = result;
  return NextResponse.json(
    {
      kitId: result.kit.id,
      username: creator.username,
      creator: {
        name: creator.name,
        username: creator.username,
        bio: creator.bio,
        avatarUrl: creator.avatarUrl ?? null,
        verifiedTier: creator.verifiedTier ?? null,
        niches: creator.niches,
        location: creator.location,
      },
      links: creator.links,
      ...view,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
