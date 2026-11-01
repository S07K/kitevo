import { getAdmin } from "@/lib/admin";
import { getDuePayouts, payableRows, payoutsCsv } from "@/lib/referrals";

/**
 * GET /api/admin/payouts/export?format=paypal|all — CSV of everything payable now.
 * "paypal" is PayPal Payouts' bulk-upload format (PayPal recipients only); "all" has full
 * details for Wise/bank transfers and bookkeeping.
 */
export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin) return new Response("Not found", { status: 404 });
  const format = new URL(req.url).searchParams.get("format") === "paypal" ? "paypal" : "all";
  const now = new Date();
  const period = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const csv = payoutsCsv(payableRows(await getDuePayouts(now)), format, period);
  const stamp = now.toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kitevo-payouts-${format}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
