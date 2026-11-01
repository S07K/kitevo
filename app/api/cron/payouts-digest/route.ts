import { NextResponse } from "next/server";
import { getDuePayouts, payableRows } from "@/lib/referrals";
import { sendPayoutsDueDigest } from "@/lib/email";

/**
 * Monthly cron (vercel.json, 1st of the month): email ADMIN_EMAILS when referral payouts
 * are due. Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const to = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (to.length === 0) return NextResponse.json({ skipped: "ADMIN_EMAILS not set" });

  const rows = await getDuePayouts();
  const payable = payableRows(rows);
  const missingDetailsCount = rows.filter((r) => r.meetsMinimum && !r.profile).length;
  if (payable.length === 0 && missingDetailsCount === 0) return NextResponse.json({ due: 0 });

  const totals: Record<string, number> = {};
  for (const r of payable) totals[r.currency] = (totals[r.currency] ?? 0) + r.amount;
  await sendPayoutsDueDigest({ to, totals, payableCount: payable.length, missingDetailsCount });
  return NextResponse.json({ due: payable.length, missingDetailsCount });
}
