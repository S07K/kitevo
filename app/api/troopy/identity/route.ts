import { createHmac } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string | null } | undefined;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.TROOPY_CHAT_SECRET;
  if (!secret) return NextResponse.json({ error: "Identity signing unavailable" }, { status: 503 });

  const identity = user.email ?? user.id;
  if (!identity) return NextResponse.json({ error: "User identity unavailable" }, { status: 400 });

  const hash = createHmac("sha256", secret).update(identity).digest("hex");
  return NextResponse.json({ hash });
}
