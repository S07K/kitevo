import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendDeleteAccountCodeEmail } from "@/lib/email";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** POST /api/me/delete-account
 *  body: { action: "request" }  → sends 6-digit code to user's email
 *  body: { action: "confirm", code: "123456" } → verifies code and deletes account
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: string; code?: string };

  // ── REQUEST: send code ─────────────────────────────────────
  if (body.action === "request") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.user.update({
      where: { id: session.user.id },
      data: { deleteAccountCode: code, deleteAccountCodeExpiresAt: expiresAt },
    });

    await sendDeleteAccountCodeEmail(user.email, code);

    return NextResponse.json({ ok: true, email: user.email });
  }

  // ── CONFIRM: verify code and delete ───────────────────────
  if (body.action === "confirm") {
    if (!body.code || !/^\d{6}$/.test(body.code)) {
      return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { deleteAccountCode: true, deleteAccountCodeExpiresAt: true },
    });

    if (!user?.deleteAccountCode) {
      return NextResponse.json({ error: "No deletion code found. Request a new one." }, { status: 400 });
    }

    if (user.deleteAccountCode !== body.code) {
      return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
    }

    if (!user.deleteAccountCodeExpiresAt || user.deleteAccountCodeExpiresAt < new Date()) {
      return NextResponse.json({ error: "Code has expired. Request a new one." }, { status: 400 });
    }

    // All good — delete the account (cascade deletes kits, inquiries, conversations etc.)
    await prisma.user.delete({ where: { id: session.user.id } });

    return NextResponse.json({ ok: true, deleted: true });
  }

  return NextResponse.json({ error: "action must be 'request' or 'confirm'" }, { status: 400 });
}
