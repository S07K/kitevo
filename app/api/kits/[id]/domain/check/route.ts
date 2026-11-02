import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dnsRecords, parseVerification, publicDomain, refreshDomain } from "@/lib/custom-domains";

export const dynamic = "force-dynamic";

/** POST — re-check DNS / verification / HTTPS for the kit's domain now. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const row = await prisma.customDomain.findFirst({ where: { kitId: id, userId: session.user.id } });
  if (!row) return NextResponse.json({ error: "No domain on this kit" }, { status: 404 });
  // Each check is several Vercel calls + an HTTPS probe; repeated clicks get the last result.
  if (row.lastCheckedAt && Date.now() - row.lastCheckedAt.getTime() < 5_000) {
    const records = dnsRecords({ hostname: row.hostname, apexName: row.apexName, verification: parseVerification(row.verification) });
    return NextResponse.json({ domain: publicDomain(row, records) });
  }
  const { domain, records } = await refreshDomain(row.id);
  return NextResponse.json({ domain: publicDomain(domain, records) });
}
