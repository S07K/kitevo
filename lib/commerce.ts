import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCTS, publicProduct, type PublicProduct } from "@/lib/commerce-shared";
import { parseSchedulerUrl } from "@/lib/scheduler-links";

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
  // Paid products only show while the creator can actually sell them (plan + payments);
  // bookings only while their scheduler is still connected.
  const sellable = rows.some((r) => r.priceCents > 0) ? await canSellPaid(userId) : false;
  const schedulers = rows.some((r) => r.type === "booking") ? await connectedSchedulers(userId) : [];
  return rows
    .filter((r) => (r.type === "booking" ? bookingIsLive(r.bookingUrl, schedulers) : r.priceCents === 0 || sellable))
    .map(publicProduct);
}

export async function connectedSchedulers(userId: string): Promise<string[]> {
  return (await prisma.schedulerConnection.findMany({ where: { userId }, select: { provider: true } })).map((r) => r.provider);
}

/** A booking shows only with a valid link on a scheduler the creator still has connected. */
export function bookingIsLive(bookingUrl: string | null, connected: string[]): boolean {
  const provider = bookingUrl ? parseSchedulerUrl(bookingUrl)?.provider : null;
  return !!provider && connected.includes(provider);
}

/** Whether a creator can take payments right now: Starter/Pro and at least one connected payment account. */
export async function canSellPaid(userId: string): Promise<boolean> {
  const { hasPaidCreatorPlan } = await import("@/lib/creator-plan");
  const [plan, connected] = await Promise.all([
    hasPaidCreatorPlan(userId),
    prisma.paymentConnection.count({ where: { userId, provider: { in: ["razorpay", "stripe"] } } }),
  ]);
  return plan && connected > 0;
}

/**
 * Record a free claim. The same email claiming the same product again gets its existing
 * order back (no duplicate leads, same delivery link).
 */
export async function claimFreeProduct(productId: string, email: string, name: string | null) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.type !== "download" || product.status !== "published" || product.priceCents !== 0 || !product.deliveryUrl) return null;
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
  const connected = await prisma.paymentConnection.count({ where: { userId, provider: { in: ["razorpay", "stripe"] } } });
  if (!connected) return { error: "Connect Razorpay or Stripe in Connectors before publishing a paid product.", code: "payments_not_connected" };
  return null;
}

/** Resolve a pasted Google short link in `bookingUrl` before validation (it can't be embedded as is). */
export async function withResolvedBookingUrl(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { isGoogleShortLink } = await import("@/lib/scheduler-links");
  if (!isGoogleShortLink(body.bookingUrl)) return body;
  const { resolveGoogleShortLink } = await import("@/lib/scheduler-connections");
  const full = await resolveGoogleShortLink(body.bookingUrl as string).catch(() => null);
  return { ...body, bookingUrl: full ?? body.bookingUrl };
}

/** A booking can only be published on a scheduler the creator has connected in Connectors. */
export async function bookingPublishProblem(userId: string, value: { type: string; status: string; bookingUrl: string | null }): Promise<{ error: string; code: string } | null> {
  if (value.type !== "booking" || value.status !== "published" || !value.bookingUrl) return null;
  const { parseSchedulerUrl, SCHEDULER_INFO } = await import("@/lib/scheduler-links");
  const provider = parseSchedulerUrl(value.bookingUrl)?.provider;
  if (!provider) return { error: "Use a Calendly, Cal.com or Google Calendar appointment link.", code: "bad_scheduler" };
  const n = await prisma.schedulerConnection.count({ where: { userId, provider } });
  return n ? null : { error: `Connect ${SCHEDULER_INFO[provider].name} in Connectors before publishing this booking.`, code: "scheduler_not_connected" };
}
