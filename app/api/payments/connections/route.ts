import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseKeyId, verifyKeys } from "@/lib/razorpay";
import { publicConnection, saveRazorpayConnection } from "@/lib/payment-connections";

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

/** POST { provider: "razorpay", keyId, keySecret } — check the keys with Razorpay, then save (secret encrypted). */
export async function POST(req: Request) {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { provider?: unknown; keyId?: unknown; keySecret?: unknown };
  if (body.provider !== "razorpay") return NextResponse.json({ error: "Only Razorpay can be connected for now." }, { status: 400 });
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

/** DELETE ?provider=razorpay — disconnect. Paid products stop selling until reconnected. */
export async function DELETE(req: Request) {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const provider = new URL(req.url).searchParams.get("provider");
  if (provider !== "razorpay") return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  await prisma.paymentConnection.deleteMany({ where: { userId, provider } });
  return NextResponse.json({ ok: true });
}
