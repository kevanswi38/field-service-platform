import { WorkOrderStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessAssignedRecord,
  isAdmin,
  resolveServerUser,
  readForbiddenResponse,
} from "@/lib/serverUser";
import { jsonError } from "@/app/api/execution/validation";

const workOrderStatusValues = Object.values(WorkOrderStatus);

export async function GET(request: NextRequest) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const statusFilter = request.nextUrl.searchParams.get("status");

  if (
    statusFilter &&
    !workOrderStatusValues.includes(statusFilter as WorkOrderStatus)
  ) {
    return jsonError('Query parameter "status" is invalid.', 400);
  }

  if (
    !isAdmin(serverUser) &&
    serverUser.role !== "operations_manager" &&
    serverUser.role !== "support" &&
    serverUser.role !== "technician"
  ) {
    return readForbiddenResponse();
  }

  const where = {
    ...(statusFilter ? { status: statusFilter as WorkOrderStatus } : {}),
    ...(!isAdmin(serverUser) ? { assignedToId: serverUser.id } : {}),
  };

  const workOrders = await prisma.workOrder.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      workOrderNumber: true,
      title: true,
      serviceType: true,
      status: true,
      assignedToId: true,
      dueAt: true,
      scheduledStart: true,
      scheduledEnd: true,
      createdAt: true,
      updatedAt: true,
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
          tasks: true,
          checklists: true,
          scheduleEvents: true,
        },
      },
    },
  });

  return NextResponse.json({
    data: workOrders,
    meta: {
      statuses: workOrderStatusValues,
    },
  });
}
