import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";

/** Quote a CSV field if it contains a comma, quote, or newline; double any inner quotes. */
function csvCell(value: string | null | undefined): string {
  const s = value ?? "";
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function slugifyFilename(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "campaign";
}

/** GET /api/social/campaigns/[id]/applications/export — brand downloads applicants as CSV */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { brandId: true, title: true } });
  if (!campaign) return new Response("Not found", { status: 404 });
  if (campaign.brandId !== session.user.id) return new Response("Forbidden", { status: 403 });

  const applications = await prisma.campaignApplication.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
    include: {
      creator: {
        select: {
          name: true,
          username: true,
          niches: true,
          kits: { where: { passwordHash: null }, take: 1, select: { slug: true } },
        },
      },
    },
  });

  const headers = ["Name", "Username", "Profile URL", "Kit URL", "Niches", "Status", "Applied At", "Message"];
  const rows = applications.map((a) => {
    const c = a.creator;
    const niches: string[] = c.niches ? (JSON.parse(c.niches) as string[]) : [];
    const kitSlug = c.kits[0]?.slug;
    return [
      c.name ?? "",
      c.username ? `@${c.username}` : "",
      c.username ? `${APP_URL}/${c.username}` : "",
      kitSlug ? `${APP_URL}/kit/${kitSlug}` : "",
      niches.join("; "),
      a.status,
      a.createdAt.toISOString().slice(0, 10),
      a.message ?? "",
    ].map(csvCell).join(",");
  });

  // Prepend a UTF-8 BOM so Excel opens accented characters correctly.
  const csv = "﻿" + [headers.join(","), ...rows].join("\r\n") + "\r\n";
  const filename = `${slugifyFilename(campaign.title)}-applicants.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
