import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseKeyId, verifyKeys } from "@/lib/razorpay";
import { PAYMENT_PROVIDERS, publicConnection, saveRazorpayConnection, saveStripeConnection } from "@/lib/payment-connections";
import { keyHint, parseRestrictedKey, verifyRestrictedKey } from "@/lib/stripe-creator";

export const dynamic = "force-dynamic";

async function creatorId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, accountType: true } });
  return u && u.accountType !== "brand" ? u.id : null;
}

/** GET — the creator's connected payment accounts (never secrets). */
export async function GET() {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.paymentConnection.findMany({ where: { userId } });
  return NextResponse.json(rows.map(publicConnection));
}

/**
 * POST { provider: "razorpay", keyId, keySecret } | { provider: "stripe", key } — check the
 * credentials with the provider, then save (secret encrypted).
 */
export async function POST(req: Request) {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { provider?: unknown; keyId?: unknown; keySecret?: unknown; key?: unknown };
  if (body.provider === "stripe") return connectStripe(userId, body.key);
  if (body.provider !== "razorpay") return NextResponse.json({ error: "Unknown payment provider." }, { status: 400 });
  const parsed = parseKeyId(body.keyId);
  if (!parsed) return NextResponse.json({ error: "That doesn't look like a Razorpay Key ID (it starts with rzp_live_ or rzp_test_).", field: "keyId" }, { status: 400 });
  const keySecret = typeof body.keySecret === "string" ? body.keySecret.trim() : "";
  if (keySecret.length < 10 || keySecret.length > 100) return NextResponse.json({ error: "Paste the Key Secret shown when you generated the key.", field: "keySecret" }, { status: 400 });
  try {
    if (!(await verifyKeys({ keyId: parsed.keyId, keySecret }))) {
      return NextResponse.json({ error: "Razorpay didn't accept these keys. Check you copied both from the same key pair.", field: "keySecret" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Couldn't reach Razorpay to check the keys. Try again in a moment." }, { status: 502 });
  }
  const row = await saveRazorpayConnection(userId, parsed.keyId, keySecret, parsed.livemode);
  return NextResponse.json(publicConnection(row), { status: 201 });
}

async function connectStripe(userId: string, raw: unknown) {
  const parsed = parseRestrictedKey(raw);
  if (!parsed) {
    const secret = typeof raw === "string" && /^sk_/.test(raw.trim());
    return NextResponse.json(
      { error: secret ? "That's a full secret key. Create a restricted key (rk_…) instead, so Kitevo can only create checkouts." : "Paste a Stripe restricted key (it starts with rk_live_ or rk_test_).", field: "key" },
      { status: 400 },
    );
  }
  try {
    const check = await verifyRestrictedKey(parsed.key);
    if (check === "invalid") return NextResponse.json({ error: "Stripe didn't accept this key. Copy it again from Developers → API keys.", field: "key" }, { status: 400 });
    if (check === "permission") return NextResponse.json({ error: "This key can't use Checkout. Edit it in Stripe and set “Checkout Sessions” to Write.", field: "key" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Couldn't reach Stripe to check the key. Try again in a moment." }, { status: 502 });
  }
  const row = await saveStripeConnection(userId, parsed.key, keyHint(parsed.key), parsed.livemode);
  return NextResponse.json(publicConnection(row), { status: 201 });
}

/** DELETE ?provider=razorpay|stripe — disconnect. Paid products stop selling until reconnected. */
export async function DELETE(req: Request) {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const provider = new URL(req.url).searchParams.get("provider");
  if (!(PAYMENT_PROVIDERS as readonly string[]).includes(provider ?? "")) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  await prisma.paymentConnection.deleteMany({ where: { userId, provider: provider! } });
  return NextResponse.json({ ok: true });
}
