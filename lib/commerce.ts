import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCTS, publicProduct, type PublicProduct } from "@/lib/commerce-shared";

export * from "@/lib/commerce-shared";

/**
 * Creator commerce (PLAN.md Phase 1). Money model: creator-owned payments — buyers pay the
 * creator's own Razorpay/Stripe/PayPal account and Kitevo never holds funds (Release B).
 * Release A (this file today): products + FREE downloads in exchange for an email, delivered
 * by a creator-supplied link that's only revealed on the buyer's private delivery page.
 */

export function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function publishedProductsFor(userId: string): Promise<PublicProduct[]> {
  const rows = await prisma.product.findMany({
    where: { userId, status: "published" },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    take: MAX_PRODUCTS,
  });
  // Paid products only show while the creator can actually sell them (plan + payments).
  const sellable = rows.some((r) => r.priceCents > 0) ? await canSellPaid(userId) : false;
  return rows.filter((r) => r.priceCents === 0 || sellable).map(publicProduct);
}

/** Whether a creator can take payments right now: Starter/Pro and a connected Razorpay account. */
export async function canSellPaid(userId: string): Promise<boolean> {
  const { hasPaidCreatorPlan } = await import("@/lib/creator-plan");
  const [plan, connected] = await Promise.all([
    hasPaidCreatorPlan(userId),
    prisma.paymentConnection.count({ where: { userId, provider: "razorpay" } }),
  ]);
  return plan && connected > 0;
}

/**
 * Record a free claim. The same email claiming the same product again gets its existing
 * order back (no duplicate leads, same delivery link).
 */
export async function claimFreeProduct(productId: string, email: string, name: string | null) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "published" || product.priceCents !== 0 || !product.deliveryUrl) return null;
  const existing = await prisma.order.findFirst({ where: { productId, buyerEmail: email, status: { in: ["free", "paid"] } }, orderBy: { createdAt: "asc" } });
  if (existing) return { order: existing, product, created: false };
  const order = await prisma.order.create({
    data: { productId, sellerId: product.userId, buyerEmail: email, buyerName: name, accessToken: newAccessToken(), status: "free", amountCents: 0, currency: product.currency },
  });
  return { order, product, created: true };
}

/**
 * Why a paid product can't be published right now, or null. Paid products need Starter/Pro
 * (Kitevo takes 0% of sales; the plan is how it earns) and a connected payment account.
 */
export async function paidPublishProblem(userId: string, value: { status: string; priceCents: number }): Promise<{ error: string; code: string } | null> {
  if (value.status !== "published" || value.priceCents === 0) return null;
  const { hasPaidCreatorPlan } = await import("@/lib/creator-plan");
  if (!(await hasPaidCreatorPlan(userId))) return { error: "Selling paid products is included in Starter and Pro. Free downloads work on every plan.", code: "plan_required" };
  const connected = await prisma.paymentConnection.count({ where: { userId, provider: "razorpay" } });
  if (!connected) return { error: "Connect your Razorpay account before publishing a paid product.", code: "payments_not_connected" };
  return null;
}
