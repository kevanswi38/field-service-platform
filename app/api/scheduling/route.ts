import { NextRequest, NextResponse } from "next/server";
import { ScheduleEventStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canAccessAssignedRecord,
  isAdmin,
  resolveServerUser,
  readForbiddenResponse,
} from "@/lib/serverUser";
import { jsonError } from "@/app/api/execution/validation";

const scheduleEventStatusValues = Object.values(ScheduleEventStatus);

export async function GET(request: NextRequest) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const statusFilter = request.nextUrl.searchParams.get("status");

  if (
    statusFilter &&
    !scheduleEventStatusValues.includes(statusFilter as ScheduleEventStatus)
  ) {
    return jsonError('Query parameter "status" is invalid.', 400);
  }

  if (
    !isAdmin(serverUser) &&
    serverUser.role !== "operations_manager" &&
    serverUser.role !== "support" &&
    serverUser.role !== "technician" &&
    serverUser.role !== "sales"
  ) {
    return readForbiddenResponse();
  }

  const where = {
    organizationId: serverUser.organizationId,
    ...(statusFilter ? { status: statusFilter as ScheduleEventStatus } : {}),
    ...(!isAdmin(serverUser) && serverUser.role !== "sales"
      ? { assignedToId: serverUser.id }
      : {}),
  };

  const events = await prisma.scheduleEvent.findMany({
    where,
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true,
      notes: true,
      assignedToId: true,
      workOrderId: true,
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      workOrder: {
        select: {
          id: true,
          workOrderNumber: true,
          title: true,
          status: true,
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    data: events,
    meta: {
      statuses: scheduleEventStatusValues,
    },
  });
}
