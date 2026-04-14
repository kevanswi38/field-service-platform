import { NextRequest, NextResponse } from "next/server";
import {
  AUTHORITY_COOKIE_NAME,
  verifyAuthorityCookie,
} from "@/lib/authority-bridge";

const protectedPlatformPathPattern =
  /^\/(dashboard|leads|customers|sites|work-orders|scheduling|walkthroughs|estimates)(\/|$)/;

const authApiPathPattern = /^\/api\/auth\/session(\/|$)/;

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const existingCookie = request.cookies.get(AUTHORITY_COOKIE_NAME)?.value;
  const verifiedUserId = await verifyAuthorityCookie(existingCookie);

  if (pathname === "/" && verifiedUserId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (protectedPlatformPathPattern.test(pathname) && !verifiedUserId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/api/") && authApiPathPattern.test(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
