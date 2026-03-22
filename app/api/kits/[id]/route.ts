import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/kit-storage";
import type { SectionVisibility } from "@/lib/kit-storage";
import type { WorkSample, KitRates, BrandPartner } from "@/lib/mock-data";
import {
  parseKitAppearance,
  serializeKitAppearance,
  type KitAppearance,
} from "@/lib/kit-appearance";

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function toKitResponse(k: {
  id: string;
  slug: string;
  name: string;
  workSamples: string;
  rates: string;
  brands: string;
  sectionVisibility: string;
  appearance: string;
}) {
  return {
    id: k.id,
    slug: k.slug,
    name: k.name,
    workSamples: parseJson<WorkSample[]>(k.workSamples, []),
    rates: parseJson<KitRates>(k.rates, { show: false }),
    brands: parseJson<BrandPartner[]>(k.brands, []),
    sectionVisibility: parseJson<SectionVisibility>(k.sectionVisibility, { ...DEFAULT_SECTION_VISIBILITY }),
    appearance: parseKitAppearance(k.appearance),
  };
}

/** GET /api/kits/[id] — get one kit (must be owner) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const kit = await prisma.kit.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!kit) {
    return NextResponse.json({ error: "Kit not found" }, { status: 404 });
  }
  return NextResponse.json(toKitResponse(kit));
}

/** PUT /api/kits/[id] — update kit */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const kit = await prisma.kit.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!kit) {
    return NextResponse.json({ error: "Kit not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Partial<{
    name: string;
    workSamples: string;
    rates: string;
    brands: string;
    sectionVisibility: string;
    appearance: string;
  }> = {};
  if (typeof body.name === "string") updates.name = body.name.trim() || kit.name;
  if (Array.isArray(body.workSamples)) updates.workSamples = JSON.stringify(body.workSamples);
  if (body.rates !== undefined && body.rates !== null) updates.rates = JSON.stringify(body.rates);
  if (Array.isArray(body.brands)) updates.brands = JSON.stringify(body.brands);
  if (body.sectionVisibility !== undefined && body.sectionVisibility !== null) {
    updates.sectionVisibility = JSON.stringify(body.sectionVisibility);
  }
  if (body.appearance !== undefined && body.appearance !== null && typeof body.appearance === "object") {
    updates.appearance = serializeKitAppearance(body.appearance as KitAppearance);
  }

  const updated = await prisma.kit.update({
    where: { id },
    data: updates,
  });
  return NextResponse.json(toKitResponse(updated));
}

/** DELETE /api/kits/[id] */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const kit = await prisma.kit.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!kit) {
    return NextResponse.json({ error: "Kit not found" }, { status: 404 });
  }
  await prisma.kit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
