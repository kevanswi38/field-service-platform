import { WalkthroughStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isAdmin,
  isSales,
  resolveServerUser,
  readForbiddenResponse,
} from "@/lib/serverUser";
import { jsonError } from "@/app/api/execution/validation";

const walkthroughStatusValues = Object.values(WalkthroughStatus);

export async function GET(request: NextRequest) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const statusFilter = request.nextUrl.searchParams.get("status");

  if (
    statusFilter &&
    !walkthroughStatusValues.includes(statusFilter as WalkthroughStatus)
  ) {
    return jsonError('Query parameter "status" is invalid.', 400);
  }

  if (
    !isAdmin(serverUser) &&
    !isSales(serverUser) &&
    serverUser.role !== "operations_manager" &&
    serverUser.role !== "support"
  ) {
    return readForbiddenResponse();
  }

  const where = {
    ...(statusFilter ? { status: statusFilter as WalkthroughStatus } : {}),
    ...(!isAdmin(serverUser) && !isSales(serverUser)
      ? { assignedToId: serverUser.id }
      : {}),
  };

  const walkthroughs = await prisma.walkthrough.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      assignedToId: true,
      scheduledStart: true,
      scheduledEnd: true,
      completedAt: true,
      canceledAt: true,
      createdAt: true,
      updatedAt: true,
      lead: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          status: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          customerNumber: true,
        },
      },
      site: {
        select: {
          id: true,
          name: true,
          siteCode: true,
          city: true,
          state: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      _count: {
        select: {
          checklists: true,
          estimates: true,
        },
      },
    },
  });

  return NextResponse.json({
    data: walkthroughs,
    meta: {
      statuses: walkthroughStatusValues,
    },
  });
}
