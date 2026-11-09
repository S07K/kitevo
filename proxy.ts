import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { APP_ORIGIN, CUSTOM_DOMAIN_ROUTE, customDomainRoute, isAppHost, normalizeHost } from "@/lib/custom-domain-host";

const auth = withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

/** Signed-in pages (was this file's matcher before custom domains needed every path). */
const PROTECTED = [/^\/dashboard(\/|$)/, /^\/kit\/edit(\/|$)/, /^\/onboarding$/, /^\/referrals$/, /^\/admin(\/|$)/, /^\/discover$/, /^\/campaigns$/, /^\/messages$/, /^\/settings$/, /^\/pipeline$/, /^\/products$/, /^\/connectors$/, /^\/deals(\/|$)/];

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const host = req.headers.get("host");
  const { pathname, search } = req.nextUrl;

  // A creator's custom domain: "/" is their kit, everything else belongs to Kitevo.
  if (!isAppHost(host)) {
    const route = customDomainRoute(pathname);
    if (route === "kit") {
      const url = req.nextUrl.clone();
      url.pathname = `${CUSTOM_DOMAIN_ROUTE}/${encodeURIComponent(normalizeHost(host!))}`;
      return NextResponse.rewrite(url);
    }
    if (route === "redirect") return NextResponse.redirect(`${APP_ORIGIN}${pathname}${search}`, 308);
    return NextResponse.next();
  }

  // The internal route is only reachable through a custom domain.
  if (pathname.startsWith(`${CUSTOM_DOMAIN_ROUTE}/`) || pathname === CUSTOM_DOMAIN_ROUTE) {
    return new NextResponse(null, { status: 404 });
  }

  if (PROTECTED.some((re) => re.test(pathname))) return auth(req as NextRequestWithAuth, event);
  return NextResponse.next();
}

export const config = {
  // Every path except build assets, so custom domains can be recognised anywhere.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
