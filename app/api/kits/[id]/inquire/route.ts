import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: kitId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, company, message } = body as Record<string, unknown>;

  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.includes("@") ||
    typeof message !== "string" || !message.trim()
  ) {
    return NextResponse.json({ error: "name, email, and message are required" }, { status: 422 });
  }

  const kit = await prisma.kit.findUnique({ where: { id: kitId }, select: { id: true } });
  if (!kit) {
    return NextResponse.json({ error: "Kit not found" }, { status: 404 });
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      kitId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: typeof company === "string" && company.trim() ? company.trim() : null,
      message: message.trim(),
    },
  });

  return NextResponse.json({ id: inquiry.id }, { status: 201 });
}
