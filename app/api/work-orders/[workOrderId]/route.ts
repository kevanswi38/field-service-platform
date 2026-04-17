import { ActivityEntityType, Prisma, WorkOrderStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import {
  canAccessAssignedRecord,
  isAdmin,
  readForbiddenResponse,
  resolveServerUser,
  writeForbiddenResponse,
} from "@/lib/serverUser";
import { ensureOptionalUserExists } from "@/app/api/execution/entities";
import {
  ParseResult,
  ensureAllowedKeys,
  jsonError,
  parseOptionalDate,
  parseRequiredString,
  toObject,
} from "@/app/api/execution/validation";

type RouteContext = {
  params: Promise<{ workOrderId: string }>;
};

type WorkOrderPatchInput = {
  status?: WorkOrderStatus;
  assignedToId?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
};

const workOrderStatusValues = Object.values(WorkOrderStatus);

const patchAllowedKeys = new Set([
  "status",
  "assignedToId",
  "scheduledStart",
  "scheduledEnd",
]);

const transitionMap: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  new: [WorkOrderStatus.scheduled, WorkOrderStatus.canceled],
  scheduled: [
    WorkOrderStatus.in_progress,
    WorkOrderStatus.on_hold,
    WorkOrderStatus.canceled,
  ],
  in_progress: [
    WorkOrderStatus.completed,
    WorkOrderStatus.on_hold,
    WorkOrderStatus.canceled,
  ],
  on_hold: [
    WorkOrderStatus.scheduled,
    WorkOrderStatus.in_progress,
    WorkOrderStatus.canceled,
  ],
  completed: [WorkOrderStatus.closed],
  canceled: [],
  closed: [],
};

const workOrderDetailSelect = {
  id: true,
  customerId: true,
  siteId: true,
  estimateId: true,
  workOrderNumber: true,
  title: true,
  description: true,
  serviceType: true,
  status: true,
  assignedToId: true,
  dueAt: true,
  scheduledStart: true,
  scheduledEnd: true,
  completedAt: true,
  closedAt: true,
  canceledAt: true,
  cancellationReason: true,
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
  estimate: {
    select: {
      id: true,
      estimateNumber: true,
      title: true,
      status: true,
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
  activityLogs: {
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 20,
    select: {
      id: true,
      action: true,
      message: true,
      occurredAt: true,
      actorUserId: true,
      metadataJson: true,
      actor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
} satisfies Prisma.WorkOrderSelect;

function parseOptionalAssignedToId(
  value: unknown
): ParseResult<string | null> {
  if (value === null) {
    return { ok: true, data: null };
  }

  const parsed = parseRequiredString("assignedToId", value);
  if (!parsed.ok) {
    return { ok: false, message: 'Field "assignedToId" must be a string or null.' };
  }

  return { ok: true, data: parsed.data };
}

function parseWorkOrderPatchPayload(
  rawBody: unknown
): ParseResult<WorkOrderPatchInput> {
  const body = toObject(rawBody);
  if (!body) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const allowed = ensureAllowedKeys(body, patchAllowedKeys);
  if (!allowed.ok) {
    return allowed;
  }

  const parsed: WorkOrderPatchInput = {};

  if ("status" in body) {
    const status = body.status;
    if (
      typeof status !== "string" ||
      !workOrderStatusValues.includes(status as WorkOrderStatus)
    ) {
      return { ok: false, message: 'Field "status" is invalid.' };
    }
    parsed.status = status as WorkOrderStatus;
  }

  if ("assignedToId" in body) {
    const assignedToId = parseOptionalAssignedToId(body.assignedToId);
    if (!assignedToId.ok) {
      return assignedToId;
    }
    parsed.assignedToId = assignedToId.data;
  }

  if ("scheduledStart" in body) {
    const scheduledStart = parseOptionalDate("scheduledStart", body.scheduledStart);
    if (!scheduledStart.ok) {
      return scheduledStart;
    }
    parsed.scheduledStart = scheduledStart.data;
  }

  if ("scheduledEnd" in body) {
    const scheduledEnd = parseOptionalDate("scheduledEnd", body.scheduledEnd);
    if (!scheduledEnd.ok) {
      return scheduledEnd;
    }
    parsed.scheduledEnd = scheduledEnd.data;
  }

  if (Object.keys(parsed).length === 0) {
    return { ok: false, message: "No valid fields were provided for update." };
  }

  return { ok: true, data: parsed };
}

function dateChanged(
  current: Date | null,
  next: Date | null | undefined
) {
  if (typeof next === "undefined") {
    return false;
  }
  if (current === null && next === null) {
    return false;
  }
  if (!current || !next) {
    return true;
  }
  return current.getTime() !== next.getTime();
}

async function loadAssignableUsers() {
  return prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["operations_manager", "support", "technician", "admin"] },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { workOrderId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: workOrderDetailSelect,
  });

  if (!workOrder) {
    return jsonError("Work order not found.", 404);
  }

  if (!canAccessAssignedRecord(serverUser, workOrder.assignedToId)) {
    return readForbiddenResponse();
  }

  const assignableUsers = isAdmin(serverUser) ? await loadAssignableUsers() : [];

  return NextResponse.json({
    data: workOrder,
    meta: {
      statuses: workOrderStatusValues,
      allowedTransitions: transitionMap[workOrder.status],
      canUpdate: canAccessAssignedRecord(serverUser, workOrder.assignedToId),
      canEditAssignment: isAdmin(serverUser),
      assignableUsers,
    },
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { workOrderId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = parseWorkOrderPatchPayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const existing = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: workOrderDetailSelect,
  });

  if (!existing) {
    return jsonError("Work order not found.", 404);
  }

  if (!canAccessAssignedRecord(serverUser, existing.assignedToId)) {
    return writeForbiddenResponse();
  }

  if (
    !isAdmin(serverUser) &&
    typeof parsed.data.assignedToId !== "undefined" &&
    parsed.data.assignedToId !== existing.assignedToId
  ) {
    return writeForbiddenResponse();
  }

  const nextStatus = parsed.data.status ?? existing.status;
  const nextAssignedToId =
    typeof parsed.data.assignedToId === "undefined"
      ? existing.assignedToId
      : parsed.data.assignedToId;
  const nextScheduledStart =
    typeof parsed.data.scheduledStart === "undefined"
      ? existing.scheduledStart
      : parsed.data.scheduledStart;
  const nextScheduledEnd =
    typeof parsed.data.scheduledEnd === "undefined"
      ? existing.scheduledEnd
      : parsed.data.scheduledEnd;

  if (
    typeof parsed.data.status !== "undefined" &&
    parsed.data.status !== existing.status &&
    !transitionMap[existing.status].includes(parsed.data.status)
  ) {
    return jsonError(
      `Status transition from "${existing.status}" to "${parsed.data.status}" is not allowed.`,
      409
    );
  }

  if (
    typeof parsed.data.status !== "undefined" &&
    parsed.data.status === WorkOrderStatus.scheduled &&
    !nextScheduledStart
  ) {
    return jsonError(
      'Status "scheduled" requires "scheduledStart" to be set.',
      409
    );
  }

  if (nextScheduledEnd && !nextScheduledStart) {
    return jsonError(
      'Field "scheduledEnd" cannot be set without "scheduledStart".',
      400
    );
  }

  if (
    nextScheduledStart &&
    nextScheduledEnd &&
    nextScheduledEnd.getTime() < nextScheduledStart.getTime()
  ) {
    return jsonError(
      'Field "scheduledEnd" must be greater than or equal to "scheduledStart".',
      400
    );
  }

  if (typeof parsed.data.assignedToId !== "undefined") {
    const assignment = await ensureOptionalUserExists(
      prisma,
      parsed.data.assignedToId,
      "assignedToId"
    );
    if (!assignment.ok) {
      return jsonError(assignment.message, 404);
    }
  }

  const statusChanged =
    typeof parsed.data.status !== "undefined" && parsed.data.status !== existing.status;
  const assignmentChanged =
    typeof parsed.data.assignedToId !== "undefined" &&
    parsed.data.assignedToId !== existing.assignedToId;
  const scheduledStartChanged = dateChanged(
    existing.scheduledStart,
    parsed.data.scheduledStart
  );
  const scheduledEndChanged = dateChanged(
    existing.scheduledEnd,
    parsed.data.scheduledEnd
  );
  const scheduleChanged = scheduledStartChanged || scheduledEndChanged;

  if (!statusChanged && !assignmentChanged && !scheduleChanged) {
    return jsonError("No changes detected for this work order.", 400);
  }

  const updateData: Prisma.WorkOrderUncheckedUpdateInput = {};
  if (statusChanged) {
    updateData.status = parsed.data.status;

    if (parsed.data.status === WorkOrderStatus.completed && !existing.completedAt) {
      updateData.completedAt = new Date();
    }
    if (parsed.data.status === WorkOrderStatus.closed && !existing.closedAt) {
      updateData.closedAt = new Date();
    }
    if (parsed.data.status === WorkOrderStatus.canceled && !existing.canceledAt) {
      updateData.canceledAt = new Date();
    }
  }

  if (assignmentChanged) {
    updateData.assignedToId = nextAssignedToId;
  }
  if (scheduledStartChanged) {
    updateData.scheduledStart = nextScheduledStart;
  }
  if (scheduledEndChanged) {
    updateData.scheduledEnd = nextScheduledEnd;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.update({
        where: { id: workOrderId },
        data: updateData,
        select: workOrderDetailSelect,
      });

      if (statusChanged) {
        await logActivity({
          client: tx,
          actorUserId: serverUser.id,
          entityType: ActivityEntityType.work_order,
          entityId: workOrder.id,
          action: "work_order.status_changed",
          message: `Work order status changed from ${existing.status} to ${workOrder.status}`,
          metadataJson: {
            from: existing.status,
            to: workOrder.status,
          },
          workOrderId: workOrder.id,
          customerId: workOrder.customerId,
          siteId: workOrder.siteId,
          estimateId: workOrder.estimateId,
        });
      }

      if (assignmentChanged) {
        await logActivity({
          client: tx,
          actorUserId: serverUser.id,
          entityType: ActivityEntityType.work_order,
          entityId: workOrder.id,
          action: "work_order.assignment_changed",
          message: "Work order assignment updated",
          metadataJson: {
            from: existing.assignedToId,
            to: workOrder.assignedToId,
          },
          workOrderId: workOrder.id,
          customerId: workOrder.customerId,
          siteId: workOrder.siteId,
          estimateId: workOrder.estimateId,
        });
      }

      if (scheduleChanged) {
        await logActivity({
          client: tx,
          actorUserId: serverUser.id,
          entityType: ActivityEntityType.work_order,
          entityId: workOrder.id,
          action: "work_order.schedule_updated",
          message: "Work order schedule window updated",
          metadataJson: {
            from: {
              scheduledStart: existing.scheduledStart?.toISOString() ?? null,
              scheduledEnd: existing.scheduledEnd?.toISOString() ?? null,
            },
            to: {
              scheduledStart: workOrder.scheduledStart?.toISOString() ?? null,
              scheduledEnd: workOrder.scheduledEnd?.toISOString() ?? null,
            },
          },
          workOrderId: workOrder.id,
          customerId: workOrder.customerId,
          siteId: workOrder.siteId,
          estimateId: workOrder.estimateId,
        });
      }

      return workOrder;
    });

    const assignableUsers = isAdmin(serverUser) ? await loadAssignableUsers() : [];

    return NextResponse.json({
      data: updated,
      meta: {
        statuses: workOrderStatusValues,
        allowedTransitions: transitionMap[updated.status],
        canUpdate: canAccessAssignedRecord(serverUser, updated.assignedToId),
        canEditAssignment: isAdmin(serverUser),
        assignableUsers,
      },
    });
  } catch (error) {
    console.error("Failed to update work order", error);
    return jsonError("Unable to update work order.", 500);
  }
}
