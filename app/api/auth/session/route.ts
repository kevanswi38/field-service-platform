import { NextRequest, NextResponse } from "next/server";
import { PlatformRole } from "@prisma/client";
import {
  AUTHORITY_COOKIE_MAX_AGE_SECONDS,
  AUTHORITY_COOKIE_NAME,
  signAuthorityCookie,
} from "@/lib/authority-bridge";
import { verifyPassword } from "@/lib/password-hash";
import { prisma } from "@/lib/prisma";
import { resolveServerUser } from "@/lib/serverUser";
import { jsonError, parseRequiredString, toObject } from "@/app/api/execution/validation";

type SessionResponseUser = {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
};

type AuthUserRow = {
  id: string;
  email: string;
  role: PlatformRole;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  passwordHash: string | null;
};

function toSessionUser(input: {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
}): SessionResponseUser {
  return {
    id: input.id,
    email: input.email,
    role: input.role,
    firstName: input.firstName,
    lastName: input.lastName,
  };
}

function applyAuthorityCookie(response: NextResponse, value: string, maxAge: number) {
  response.cookies.set({
    name: AUTHORITY_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

// Foundation auth path:
// requires email + password proof, then issues an app-signed request-scoped cookie.
// This is intentionally minimal and does not yet include full production auth features.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const payload = toObject(body);
  if (!payload) {
    return jsonError("Request body must be a JSON object.", 400);
  }

  const emailParsed = parseRequiredString("email", payload.email);
  if (!emailParsed.ok) {
    return jsonError(emailParsed.message, 400);
  }

  const passwordParsed = parseRequiredString("password", payload.password);
  if (!passwordParsed.ok) {
    return jsonError(passwordParsed.message, 400);
  }

  const email = emailParsed.data.toLowerCase();
  const userRows = await prisma.$queryRaw<AuthUserRow[]>`
    SELECT
      "id",
      "email",
      "role",
      "firstName",
      "lastName",
      "isActive",
      "passwordHash"
    FROM "User"
    WHERE "email" = ${email}
    LIMIT 1
  `;
  const user = userRows[0] ?? null;

  if (!user || !user.isActive || !user.passwordHash) {
    return jsonError("Invalid credentials.", 401);
  }

  const passwordMatches = await verifyPassword(
    passwordParsed.data,
    user.passwordHash
  );
  if (!passwordMatches) {
    return jsonError("Invalid credentials.", 401);
  }

  const signedAuthorityCookie = await signAuthorityCookie(user.id);
  if (!signedAuthorityCookie) {
    return jsonError(
      "Session signing secret is not configured. Set FSM_AUTH_BRIDGE_SECRET or NEXTAUTH_SECRET before running auth.",
      500
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const response = NextResponse.json({
    data: toSessionUser({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    }),
  });
  applyAuthorityCookie(response, signedAuthorityCookie, AUTHORITY_COOKIE_MAX_AGE_SECONDS);
  return response;
}

export async function GET(request: NextRequest) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json({
    data: toSessionUser({
      id: auth.data.id,
      email: auth.data.email,
      role: auth.data.role,
      firstName: auth.data.firstName,
      lastName: auth.data.lastName,
    }),
  });
}

export async function DELETE() {
  const response = NextResponse.json({ data: { signedOut: true } });
  applyAuthorityCookie(response, "", 0);
  return response;
}
