import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTrialEligibility, trialDays } from "@/lib/trials";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/trial — whether to offer the Pro free trial, for button labels. Signed-out
 * visitors get the length only (eligible: false). The checkout route re-checks everything.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ eligible: false, signedIn: false, days: trialDays() }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const e = await getTrialEligibility(session.user.id);
  return NextResponse.json(
    { eligible: e.eligible, signedIn: true, days: e.days, ...(e.eligible ? {} : { reason: e.reason }) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
