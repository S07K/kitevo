import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPayoutProfile, savePayoutProfile, validatePayoutProfile } from "@/lib/referrals";

/** PUT /api/referrals/payout-profile — where the user wants referral earnings sent. */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = validatePayoutProfile(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await savePayoutProfile(session.user.id, parsed.value);
  return NextResponse.json({ payoutProfile: await getPayoutProfile(session.user.id) });
}
