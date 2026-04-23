import { PlatformRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUTHORITY_COOKIE_NAME,
  verifyAuthorityCookie,
} from "@/lib/authority-bridge";

export type ServerUser = {
  id: string;
  organizationId: string;
  role: PlatformRole;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type ServerUserResult =
  | { ok: true; data: ServerUser }
  | { ok: false; response: NextResponse };

function unauthorized(message: string) {
  return NextResponse.json({ error: { message } }, { status: 401 });
}

export function writeForbiddenResponse() {
  return NextResponse.json(
    {
      error: {
        message: "Forbidden: write access denied for current role.",
      },
    },
    { status: 403 }
  );
}

export function readForbiddenResponse() {
  return NextResponse.json(
    {
      error: {
        message: "Forbidden: read access denied for current role.",
      },
    },
    { status: 403 }
  );
}

// Temporary request-bound auth resolver until full session auth is wired.
// Source of identity is an app-signed httpOnly cookie issued by /api/auth/session.
// Client-provided actor fields and UI role state are not authoritative.
async function resolveSessionUserById(userId: string): Promise<ServerUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      organizationId: true,
      role: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user.id,
    organizationId: user.organizationId,
    role: user.role,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export async function resolveSessionUserFromCookie(
  rawAuthorityCookie: string | null | undefined
): Promise<ServerUser | null> {
  const cookieUserId = await verifyAuthorityCookie(rawAuthorityCookie);
  if (!cookieUserId) {
    return null;
  }

  return resolveSessionUserById(cookieUserId);
}

export async function resolveServerUser(
  request: NextRequest
): Promise<ServerUserResult> {
  const rawAuthorityCookie = request.cookies.get(AUTHORITY_COOKIE_NAME)?.value;
  const sessionUser = await resolveSessionUserFromCookie(rawAuthorityCookie);
  if (!sessionUser) {
    return {
      ok: false,
      response: unauthorized("Unauthorized: missing or invalid authenticated session."),
    };
  }

  return {
    ok: true,
    data: sessionUser,
  };
}

export function isAdmin(user: ServerUser) {
  return user.role === PlatformRole.admin;
}

export function isOperationsOrSupport(user: ServerUser) {
  return (
    user.role === PlatformRole.operations_manager ||
    user.role === PlatformRole.support
  );
}

export function isSales(user: ServerUser) {
  return user.role === PlatformRole.sales;
}

export function isTechnician(user: ServerUser) {
  return user.role === PlatformRole.technician;
}

export function canAccessAssignedRecord(
  user: ServerUser,
  assignedToId: string | null | undefined
) {
  if (isAdmin(user)) {
    return true;
  }

  if (isOperationsOrSupport(user) || isTechnician(user)) {
    return Boolean(assignedToId) && assignedToId === user.id;
  }

  return false;
}

export function canReadAssignedRecord(
  user: ServerUser,
  assignedToId: string | null | undefined,
  options?: { allowSalesRead?: boolean }
) {
  if (isAdmin(user)) {
    return true;
  }

  if (options?.allowSalesRead && isSales(user)) {
    return true;
  }

  return canAccessAssignedRecord(user, assignedToId);
}

export function canCreateLead(user: ServerUser) {
  return isAdmin(user) || isSales(user) || isOperationsOrSupport(user);
}

export function canMutateLead(
  user: ServerUser,
  assignedToId: string | null | undefined
) {
  if (isAdmin(user) || isSales(user)) {
    return true;
  }

  if (isOperationsOrSupport(user)) {
    return Boolean(assignedToId) && assignedToId === user.id;
  }

  return false;
}

export function canReadLead(
  user: ServerUser,
  assignedToId: string | null | undefined
) {
  if (isAdmin(user) || isSales(user)) {
    return true;
  }

  if (isOperationsOrSupport(user)) {
    return Boolean(assignedToId) && assignedToId === user.id;
  }

  return false;
}
