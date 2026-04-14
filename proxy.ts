import { NextRequest, NextResponse } from "next/server";
import {
  AUTHORITY_BOOTSTRAP_USER_ENV_KEY,
  AUTHORITY_COOKIE_MAX_AGE_SECONDS,
  AUTHORITY_COOKIE_NAME,
  signAuthorityCookie,
  verifyAuthorityCookie,
} from "@/lib/authority-bridge";

// Temporary authority bootstrap until full authentication/session infrastructure is
// integrated. The app issues and verifies its own signed authority cookie.
export async function proxy(request: NextRequest) {
  const existingCookie = request.cookies.get(AUTHORITY_COOKIE_NAME)?.value;
  const verifiedUserId = await verifyAuthorityCookie(existingCookie);
  if (verifiedUserId) {
    return NextResponse.next();
  }

  const bootstrapUserId = process.env[AUTHORITY_BOOTSTRAP_USER_ENV_KEY]?.trim();
  if (!bootstrapUserId) {
    return NextResponse.next();
  }

  const signedAuthorityCookie = await signAuthorityCookie(bootstrapUserId);
  if (!signedAuthorityCookie) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set({
    name: AUTHORITY_COOKIE_NAME,
    value: signedAuthorityCookie,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTHORITY_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
