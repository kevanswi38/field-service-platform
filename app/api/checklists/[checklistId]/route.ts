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

const checklistAuthoritySelect = {
  id: true,
  walkthroughId: true,
  workOrder: {
    select: { assignedToId: true },
  },
  walkthrough: {
    select: { assignedToId: true },
  },
} satisfies Prisma.ChecklistSelect;

function resolveChecklistAssignedToIdFromRecord(input: {
  workOrder: { assignedToId: string | null } | null;
  walkthrough: { assignedToId: string | null } | null;
}) {
  return input.workOrder?.assignedToId ?? input.walkthrough?.assignedToId ?? null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { checklistId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const checklistAuthority = await prisma.checklist.findFirst({
    where: { id: checklistId, organizationId: serverUser.organizationId },
    select: checklistAuthoritySelect,
  });

  if (!checklistAuthority) {
    return jsonError("Checklist not found.", 404);
  }

  const assignedToId = resolveChecklistAssignedToIdFromRecord(checklistAuthority);
  const allowSalesRead = Boolean(checklistAuthority.walkthroughId);
  if (
    !canReadAssignedRecord(serverUser, assignedToId, {
      allowSalesRead,
    })
  ) {
    return readForbiddenResponse();
  }

  const checklist = await prisma.checklist.findFirst({
    where: { id: checklistId, organizationId: serverUser.organizationId },
    select: checklistSelect,
  });
  if (!checklist) {
    return jsonError("Checklist not found.", 404);
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

  const existingChecklist = await prisma.checklist.findFirst({
    where: { id: checklistId, organizationId: serverUser.organizationId },
    select: checklistAuthoritySelect,
  });
  if (!existingChecklist) {
    return jsonError("Checklist not found.", 404);
  }

  const assignedToId = resolveChecklistAssignedToIdFromRecord(existingChecklist);
  if (!canAccessAssignedRecord(serverUser, assignedToId)) {
    return writeForbiddenResponse();
  }

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

  const existingChecklistRecord = await prisma.checklist.findFirst({
    where: { id: checklistId, organizationId: serverUser.organizationId },
    select: checklistSelect,
  });
  if (!existingChecklistRecord) {
    return jsonError("Checklist not found.", 404);
  }

  const nextStatus = parsed.data.status ?? existingChecklistRecord.status;
  const statusExplicitlyChanged =
    typeof parsed.data.status !== "undefined" &&
    parsed.data.status !== existingChecklistRecord.status;

  let normalizedCompletedAt =
    typeof parsed.data.completedAt === "undefined"
      ? existingChecklistRecord.completedAt
      : parsed.data.completedAt;

  if (
    statusExplicitlyChanged &&
    nextStatus !== ChecklistStatus.completed &&
    typeof parsed.data.completedAt === "undefined"
  ) {
    normalizedCompletedAt = null;
  }

  if (nextStatus !== ChecklistStatus.completed && normalizedCompletedAt !== null) {
    return jsonError(
      'Field "completedAt" can only be set when checklist status is "completed".',
      409
    );
  }

  if (nextStatus === ChecklistStatus.completed && normalizedCompletedAt === null) {
    normalizedCompletedAt = new Date();
  }

  const normalizedCompletedAtChanged =
    (existingChecklistRecord.completedAt?.getTime() ?? null) !==
    (normalizedCompletedAt?.getTime() ?? null);

  const changedKeys = checklistChangedKeys(existingChecklistRecord, parsed.data);
  if (changedKeys.length === 0 && !normalizedCompletedAtChanged) {
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
            updateData.completedAt = normalizedCompletedAt;
            break;
          default:
            break;
        }
      }

      if (normalizedCompletedAtChanged && !changedKeys.includes("completedAt")) {
        updateData.completedAt = normalizedCompletedAt;
      }

      const checklist = await tx.checklist.update({
        where: { id: checklistId },
        data: updateData,
        select: checklistSelect,
      });

      const target = checklistActivityTarget(checklist);
      if (target) {
        const statusChanged = existingChecklistRecord.status !== checklist.status;
        const movedToCompleted =
          statusChanged &&
          existingChecklistRecord.status !== ChecklistStatus.completed &&
          checklist.status === ChecklistStatus.completed;

        const completionTimestampChanged =
          (existingChecklistRecord.completedAt?.getTime() ?? null) !==
          (checklist.completedAt?.getTime() ?? null);
        const nonStatusChangedKeys = changedKeys.filter((key) => key !== "status");
        if (completionTimestampChanged && !nonStatusChangedKeys.includes("completedAt")) {
          nonStatusChangedKeys.push("completedAt");
        }

        if (statusChanged) {
          await logActivity({
            client: tx,
            actorUserId: serverUser.id,
            ...target,
            action: "checklist.status_changed",
            message: `Checklist status changed from ${existingChecklistRecord.status} to ${checklist.status}`,
            metadataJson: {
              checklistId: checklist.id,
              from: existingChecklistRecord.status,
              to: checklist.status,
            },
          });
        }

        if (movedToCompleted) {
          await logActivity({
            client: tx,
            actorUserId: serverUser.id,
            ...target,
            action: "checklist.completed",
            message: `Checklist completed: ${checklist.title}`,
            metadataJson: {
              checklistId: checklist.id,
              from: existingChecklistRecord.status,
              to: checklist.status,
              completedAt: checklist.completedAt?.toISOString() ?? null,
            },
          });
        }

        if (nonStatusChangedKeys.length > 0) {
          await logActivity({
            client: tx,
            actorUserId: serverUser.id,
            ...target,
            action: "checklist.updated",
            message: `Checklist updated: ${checklist.title}`,
            metadataJson: {
              checklistId: checklist.id,
              changedKeys: nonStatusChangedKeys,
            },
          });
        }
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
