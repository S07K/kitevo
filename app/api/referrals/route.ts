import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPayoutProfile, getReferralSummary } from "@/lib/referrals";

/** GET /api/referrals — the signed-in user's referral link, earnings and payout details. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [summary, payoutProfile] = await Promise.all([
    getReferralSummary(session.user.id),
    getPayoutProfile(session.user.id),
  ]);
  return NextResponse.json({ ...summary, payoutProfile });
}
