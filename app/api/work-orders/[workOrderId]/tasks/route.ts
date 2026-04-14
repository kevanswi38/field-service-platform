import {
  ActivityEntityType,
  Prisma,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import {
  canAccessAssignedRecord,
  canReadAssignedRecord,
  readForbiddenResponse,
  resolveServerUser,
  writeForbiddenResponse,
} from "@/lib/serverUser";
import {
  ensureOptionalAssetExists,
  ensureOptionalTemplateExists,
} from "@/app/api/execution/entities";
import { taskSelect } from "@/app/api/execution/selects";
import {
  parseTaskCreatePayload,
  parseTaskStatusQuery,
  taskPriorityValues,
  taskStatusValues,
} from "@/app/api/execution/tasks";
import { jsonError } from "@/app/api/execution/validation";

type RouteContext = {
  params: Promise<{ workOrderId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { workOrderId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: { id: true, assignedToId: true },
  });
  if (!workOrder) {
    return jsonError("Work order not found.", 404);
  }

  if (!canReadAssignedRecord(serverUser, workOrder.assignedToId)) {
    return readForbiddenResponse();
  }

  const status = parseTaskStatusQuery(request.nextUrl.searchParams.get("status"));
  if (!status.ok) {
    return jsonError(status.message, 400);
  }

  const tasks = await prisma.task.findMany({
    where: {
      workOrderId,
      status: status.data ?? undefined,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: taskSelect,
  });

  return NextResponse.json({
    data: tasks,
    meta: {
      statuses: taskStatusValues,
      priorities: taskPriorityValues,
    },
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { workOrderId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: { id: true, assignedToId: true },
  });
  if (!workOrder) {
    return jsonError("Work order not found.", 404);
  }

  if (!canAccessAssignedRecord(serverUser, workOrder.assignedToId)) {
    return writeForbiddenResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = parseTaskCreatePayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  try {
    const task = await prisma.$transaction(async (tx) => {
      const assetCheck = await ensureOptionalAssetExists(tx, parsed.data.assetId);
      if (!assetCheck.ok) {
        throw new Error(assetCheck.message);
      }

      const templateCheck = await ensureOptionalTemplateExists(
        tx,
        parsed.data.templateId
      );
      if (!templateCheck.ok) {
        throw new Error(templateCheck.message);
      }

      const createData: Prisma.TaskUncheckedCreateInput = {
        workOrderId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: parsed.data.status ?? TaskStatus.todo,
        priority: parsed.data.priority ?? TaskPriority.normal,
        taskType: parsed.data.taskType ?? "general",
        sortOrder: parsed.data.sortOrder ?? 0,
        isRequired: parsed.data.isRequired ?? true,
        dueAt: parsed.data.dueAt ?? null,
        completedAt: parsed.data.completedAt ?? null,
        resultNotes: parsed.data.resultNotes ?? null,
        assignedToId: serverUser.id,
        assetId: parsed.data.assetId ?? null,
        templateId: parsed.data.templateId ?? null,
      };

      const createdTask = await tx.task.create({
        data: createData,
        select: taskSelect,
      });

      await logActivity({
        client: tx,
        actorUserId: serverUser.id,
        entityType: ActivityEntityType.work_order,
        entityId: workOrderId,
        action: "task.created",
        message: `Task created: ${createdTask.title}`,
        metadataJson: {
          taskId: createdTask.id,
          status: createdTask.status,
          assignedToId: createdTask.assignedToId,
        },
        workOrderId,
      });

      return createdTask;
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create task.";
    if (message.includes("not found")) {
      return jsonError(message, 404);
    }

    console.error("Failed to create task", error);
    return jsonError("Unable to create task.", 500);
  }
}
