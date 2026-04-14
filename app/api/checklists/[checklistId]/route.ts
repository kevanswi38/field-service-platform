import { ChecklistStatus, Prisma } from "@prisma/client";
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
  checklistActivityTarget,
  ensureOptionalTemplateExists,
  resolveChecklistAssignedToId,
} from "@/app/api/execution/entities";
import { checklistSelect } from "@/app/api/execution/selects";
import {
  checklistChangedKeys,
  parseChecklistPatchPayload,
} from "@/app/api/execution/checklists";
import { jsonError } from "@/app/api/execution/validation";

type RouteContext = {
  params: Promise<{ checklistId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { checklistId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    select: checklistSelect,
  });

  if (!checklist) {
    return jsonError("Checklist not found.", 404);
  }

  const assignedToId = await resolveChecklistAssignedToId(prisma, checklistId);
  const allowSalesRead = Boolean(checklist.walkthroughId);
  if (
    !canReadAssignedRecord(serverUser, assignedToId, {
      allowSalesRead,
    })
  ) {
    return readForbiddenResponse();
  }

  return NextResponse.json({ data: checklist });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { checklistId } = await context.params;
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

  const parsed = parseChecklistPatchPayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const existingChecklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    select: checklistSelect,
  });
  if (!existingChecklist) {
    return jsonError("Checklist not found.", 404);
  }

  const assignedToId = await resolveChecklistAssignedToId(prisma, checklistId);
  if (!canAccessAssignedRecord(serverUser, assignedToId)) {
    return writeForbiddenResponse();
  }

  const changedKeys = checklistChangedKeys(existingChecklist, parsed.data);
  if (changedKeys.length === 0) {
    return jsonError("No changes detected for this checklist.", 400);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const templateCheck = await ensureOptionalTemplateExists(
        tx,
        parsed.data.templateId
      );
      if (!templateCheck.ok) {
        throw new Error(templateCheck.message);
      }

      const updateData: Prisma.ChecklistUncheckedUpdateInput = {};
      for (const key of changedKeys) {
        switch (key) {
          case "title":
            updateData.title = parsed.data.title;
            break;
          case "description":
            updateData.description = parsed.data.description ?? null;
            break;
          case "status":
            updateData.status = parsed.data.status;
            break;
          case "templateId":
            updateData.templateId = parsed.data.templateId ?? null;
            break;
          case "completedAt":
            updateData.completedAt = parsed.data.completedAt ?? null;
            break;
          default:
            break;
        }
      }

      const checklist = await tx.checklist.update({
        where: { id: checklistId },
        data: updateData,
        select: checklistSelect,
      });

      const target = checklistActivityTarget(checklist);
      if (target) {
        if (
          changedKeys.includes("status") &&
          existingChecklist.status !== ChecklistStatus.completed &&
          checklist.status === ChecklistStatus.completed
        ) {
          await logActivity({
            client: tx,
            actorUserId: serverUser.id,
            ...target,
            action: "checklist.completed",
            message: `Checklist completed: ${checklist.title}`,
            metadataJson: {
              checklistId: checklist.id,
              from: existingChecklist.status,
              to: checklist.status,
            },
          });
        }

        await logActivity({
          client: tx,
          actorUserId: serverUser.id,
          ...target,
          action: "checklist.updated",
          message: `Checklist updated: ${checklist.title}`,
          metadataJson: {
            checklistId: checklist.id,
            changedKeys,
          },
        });
      }

      return checklist;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update checklist.";
    if (message.includes("not found")) {
      return jsonError(message, 404);
    }

    console.error("Failed to update checklist", error);
    return jsonError("Unable to update checklist.", 500);
  }
}
