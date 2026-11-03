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
  return rows.map(publicProduct);
}

/**
 * Record a free claim. The same email claiming the same product again gets its existing
 * order back (no duplicate leads, same delivery link).
 */
export async function claimFreeProduct(productId: string, email: string, name: string | null) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "published" || product.priceCents !== 0 || !product.deliveryUrl) return null;
  const existing = await prisma.order.findFirst({ where: { productId, buyerEmail: email }, orderBy: { createdAt: "asc" } });
  if (existing) return { order: existing, product, created: false };
  const order = await prisma.order.create({
    data: { productId, sellerId: product.userId, buyerEmail: email, buyerName: name, accessToken: newAccessToken(), status: "free", amountCents: 0, currency: product.currency },
  });
  return { order, product, created: true };
}
