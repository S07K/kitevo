import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const brand = await prisma.brandProfile.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(brand ?? null);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    companyName?: string;
    industry?: string;
    budgetRange?: string;
    website?: string;
    logoUrl?: string;
    description?: string;
  };

  if (!body.companyName?.trim() || !body.industry?.trim() || !body.budgetRange?.trim()) {
    return NextResponse.json({ error: "companyName, industry, and budgetRange are required" }, { status: 400 });
  }

  const brand = await prisma.brandProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      companyName: body.companyName.trim(),
      industry: body.industry.trim(),
      budgetRange: body.budgetRange.trim(),
      website: body.website?.trim() || null,
      logoUrl: body.logoUrl?.trim() || null,
      description: body.description?.trim() || null,
    },
    update: {
      companyName: body.companyName.trim(),
      industry: body.industry.trim(),
      budgetRange: body.budgetRange.trim(),
      website: body.website?.trim() || null,
      logoUrl: body.logoUrl?.trim() || null,
      description: body.description?.trim() || null,
    },
  });

  // Ensure user is flagged as brand
  await prisma.user.update({
    where: { id: session.user.id },
    data: { accountType: "brand" },
  });

  return NextResponse.json(brand);
}
