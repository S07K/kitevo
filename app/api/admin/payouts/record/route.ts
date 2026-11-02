import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { recordPayout } from "@/lib/referrals";
import { sendReferralPayoutReceipt } from "@/lib/email";
import { prisma } from "@/lib/prisma";

type Item = { referrerId: string; currency: string };

/**
 * POST /api/admin/payouts/record — after paying a batch by PayPal/Wise/bank, record it in
 * one go: { items: [{ referrerId, currency }], reference }. Each referrer's whole available
 * balance in that currency is marked paid and they get an email receipt.
 */
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { items?: Item[]; reference?: string } | null;
  const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
  const items = Array.isArray(body?.items) ? body!.items.filter((i) => i && typeof i.referrerId === "string" && typeof i.currency === "string") : [];
  if (!reference) return NextResponse.json({ error: "Enter the PayPal/Wise/bank reference for this batch." }, { status: 400 });
  if (items.length === 0) return NextResponse.json({ error: "Nothing selected." }, { status: 400 });

  const results: Array<{ referrerId: string; currency: string; amount: number | null; error?: string }> = [];
  for (const item of items) {
    try {
      const paid = await recordPayout({ referrerId: item.referrerId, currency: item.currency, reference });
      results.push({ ...item, amount: paid?.amount ?? null });
      if (paid) {
        const user = await prisma.user.findUnique({ where: { id: item.referrerId }, select: { email: true, name: true } });
        if (user?.email) {
          sendReferralPayoutReceipt({ email: user.email, name: user.name, amount: paid.amount, currency: item.currency, reference })
            .catch((e) => console.error("[payouts] receipt email failed:", e));
        }
      }
    } catch (e) {
      results.push({ ...item, amount: null, error: e instanceof Error ? e.message : "Failed" });
    }
  }
  console.log(`[payouts] ${admin.email} recorded batch "${reference}": ${results.filter((r) => r.amount).length} paid`);
  return NextResponse.json({ results });
}
