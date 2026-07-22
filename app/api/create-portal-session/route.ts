import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { getSubscriptionCustomerId } from "@/lib/subscription-cookie";

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id as string | undefined;
    const returnTo = body.returnTo as string | undefined;
    const returnUrl = `${BASE_URL}${returnTo === "brand" ? "/brand/settings" : "/dashboard"}`;
    const authSession = await getServerSession(authOptions);

    let customerId: string | null = null;

    if (sessionId && payments.isCheckoutSessionId(sessionId)) {
      const checkout = await payments.getCheckout(sessionId);
      customerId = checkout?.customerId ?? null;
    } else if (authSession?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: authSession.user.id },
        select: { stripeCustomerId: true },
      });
      customerId = user?.stripeCustomerId ?? getSubscriptionCustomerId(cookieHeader);
    } else {
      customerId = getSubscriptionCustomerId(cookieHeader);
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "Not subscribed or session expired. Subscribe first, then use Manage subscription." },
        { status: 400 }
      );
    }

    const url = await payments.createBillingPortalUrl(customerId, returnUrl);

    return NextResponse.json({ url });
  } catch (err: unknown) {
    console.error("Create portal session error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
