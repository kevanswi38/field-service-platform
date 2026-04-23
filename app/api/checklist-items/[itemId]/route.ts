import { Prisma } from "@prisma/client";
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
  resolveChecklistAssignedToId,
} from "@/app/api/execution/entities";
import { checklistItemSelect } from "@/app/api/execution/selects";
import {
  checklistItemChangedKeys,
  parseChecklistItemPatchPayload,
} from "@/app/api/execution/checklists";
import { jsonError } from "@/app/api/execution/validation";

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { itemId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, organizationId: serverUser.organizationId },
    select: {
      ...checklistItemSelect,
      checklist: {
        select: {
          walkthroughId: true,
        },
      },
    },
  });

  if (!item) {
    return jsonError("Checklist item not found.", 404);
  }

  const assignedToId = await resolveChecklistAssignedToId(
    prisma,
    item.checklistId,
    serverUser.organizationId
  );
  if (
    !canReadAssignedRecord(serverUser, assignedToId, {
      allowSalesRead: Boolean(item.checklist?.walkthroughId),
    })
  ) {
    return readForbiddenResponse();
  }

  const { checklist, ...itemData } = item;
  return NextResponse.json({ data: itemData });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { itemId } = await context.params;
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

  const parsed = parseChecklistItemPatchPayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const existing = await prisma.checklistItem.findFirst({
    where: { id: itemId, organizationId: serverUser.organizationId },
    select: checklistItemSelect,
  });
  if (!existing) {
    return jsonError("Checklist item not found.", 404);
  }

  const assignedToId = await resolveChecklistAssignedToId(
    prisma,
    existing.checklistId,
    serverUser.organizationId
  );
  if (!canAccessAssignedRecord(serverUser, assignedToId)) {
    return writeForbiddenResponse();
  }

  const changedKeys = checklistItemChangedKeys(existing, parsed.data);
  if (changedKeys.length === 0) {
    return jsonError("No changes detected for this checklist item.", 400);
  }

  try {
    const item = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.ChecklistItemUncheckedUpdateInput = {};
      for (const key of changedKeys) {
        switch (key) {
          case "title":
            updateData.title = parsed.data.title;
            break;
          case "description":
            updateData.description = parsed.data.description ?? null;
            break;
          case "isCompleted":
            updateData.isCompleted = parsed.data.isCompleted;
            break;
          case "sortOrder":
            updateData.sortOrder = parsed.data.sortOrder;
            break;
          case "isRequired":
            updateData.isRequired = parsed.data.isRequired;
            break;
          case "completedAt":
            updateData.completedAt = parsed.data.completedAt ?? null;
            break;
          case "resultNotes":
            updateData.resultNotes = parsed.data.resultNotes ?? null;
            break;
          default:
            break;
        }
      }

      const updated = await tx.checklistItem.update({
        where: { id: itemId },
        data: updateData,
        select: checklistItemSelect,
      });

      const checklist = await tx.checklist.findFirst({
        where: { id: updated.checklistId, organizationId: serverUser.organizationId },
        select: { id: true, workOrderId: true, walkthroughId: true, title: true },
      });

      if (checklist) {
        const target = checklistActivityTarget(checklist);
        if (target) {
          await logActivity({
            client: tx,
            actorUserId: serverUser.id,
            ...target,
            action: "checklist.item_updated",
            message: `Checklist item updated in ${checklist.title}`,
            metadataJson: {
              checklistId: checklist.id,
              checklistItemId: updated.id,
              changedKeys,
            },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ data: item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update checklist item.";
    if (message.includes("not found")) {
      return jsonError(message, 404);
    }

    console.error("Failed to update checklist item", error);
    return jsonError("Unable to update checklist item.", 500);
  }
}
