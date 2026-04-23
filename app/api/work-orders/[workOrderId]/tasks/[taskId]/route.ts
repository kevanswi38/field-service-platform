import { ActivityEntityType, Prisma, TaskStatus } from "@prisma/client";
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
import { parseTaskPatchPayload, taskChangedKeys } from "@/app/api/execution/tasks";
import { jsonError } from "@/app/api/execution/validation";

type RouteContext = {
  params: Promise<{ workOrderId: string; taskId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { workOrderId, taskId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, organizationId: serverUser.organizationId },
    select: { id: true, assignedToId: true },
  });
  if (!workOrder) {
    return jsonError("Work order not found.", 404);
  }

  if (!canReadAssignedRecord(serverUser, workOrder.assignedToId)) {
    return readForbiddenResponse();
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      workOrderId,
      organizationId: serverUser.organizationId,
    },
    select: taskSelect,
  });

  if (!task) {
    return jsonError("Task not found.", 404);
  }

  return NextResponse.json({ data: task });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { workOrderId, taskId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, organizationId: serverUser.organizationId },
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

  const parsed = parseTaskPatchPayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const existingTask = await prisma.task.findFirst({
    where: {
      id: taskId,
      workOrderId,
      organizationId: serverUser.organizationId,
    },
    select: taskSelect,
  });
  if (!existingTask) {
    return jsonError("Task not found.", 404);
  }

  const changedKeys = taskChangedKeys(existingTask, parsed.data);
  if (changedKeys.length === 0) {
    return jsonError("No changes detected for this task.", 400);
  }

  try {
    const task = await prisma.$transaction(async (tx) => {
      const assetCheck = await ensureOptionalAssetExists(
        tx,
        parsed.data.assetId,
        serverUser.organizationId
      );
      if (!assetCheck.ok) throw new Error(assetCheck.message);

      const templateCheck = await ensureOptionalTemplateExists(
        tx,
        parsed.data.templateId
      );
      if (!templateCheck.ok) throw new Error(templateCheck.message);

      const updateInput: Prisma.TaskUncheckedUpdateInput = {};
      for (const key of changedKeys) {
        switch (key) {
          case "title":
            updateInput.title = parsed.data.title;
            break;
          case "description":
            updateInput.description = parsed.data.description ?? null;
            break;
          case "status":
            updateInput.status = parsed.data.status;
            break;
          case "priority":
            updateInput.priority = parsed.data.priority;
            break;
          case "taskType":
            updateInput.taskType = parsed.data.taskType;
            break;
          case "sortOrder":
            updateInput.sortOrder = parsed.data.sortOrder;
            break;
          case "isRequired":
            updateInput.isRequired = parsed.data.isRequired;
            break;
          case "dueAt":
            updateInput.dueAt = parsed.data.dueAt ?? null;
            break;
          case "completedAt":
            updateInput.completedAt = parsed.data.completedAt ?? null;
            break;
          case "resultNotes":
            updateInput.resultNotes = parsed.data.resultNotes ?? null;
            break;
          case "assetId":
            updateInput.assetId = parsed.data.assetId ?? null;
            break;
          case "templateId":
            updateInput.templateId = parsed.data.templateId ?? null;
            break;
          default:
            break;
        }
      }

      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: updateInput,
        select: taskSelect,
      });

      const statusChanged = changedKeys.includes("status");
      const movedToCompleted =
        statusChanged &&
        existingTask.status !== TaskStatus.completed &&
        updatedTask.status === TaskStatus.completed;

      if (movedToCompleted) {
        await logActivity({
          client: tx,
          actorUserId: serverUser.id,
          entityType: ActivityEntityType.work_order,
          entityId: workOrderId,
          action: "task.completed",
          message: `Task completed: ${updatedTask.title}`,
          metadataJson: {
            taskId: updatedTask.id,
            from: existingTask.status,
            to: updatedTask.status,
          },
          workOrderId,
        });
      }

      await logActivity({
        client: tx,
        actorUserId: serverUser.id,
        entityType: ActivityEntityType.work_order,
        entityId: workOrderId,
        action: "task.updated",
        message: `Task updated: ${updatedTask.title}`,
        metadataJson: {
          taskId: updatedTask.id,
          changedKeys,
        },
        workOrderId,
      });

      return updatedTask;
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update task.";
    if (message.includes("not found")) {
      return jsonError(message, 404);
    }

    console.error("Failed to update task", error);
    return jsonError("Unable to update task.", 500);
  }
}
