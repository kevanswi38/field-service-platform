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
} from "@/app/api/execution/entities";
import { checklistItemSelect } from "@/app/api/execution/selects";
import { parseChecklistItemCreatePayload } from "@/app/api/execution/checklists";
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
    select: {
      id: true,
      walkthroughId: true,
      workOrder: { select: { assignedToId: true } },
      walkthrough: { select: { assignedToId: true } },
    },
  });

  if (!checklist) {
    return jsonError("Checklist not found.", 404);
  }

  const assignedToId =
    checklist.workOrder?.assignedToId ?? checklist.walkthrough?.assignedToId ?? null;

  if (
    !canReadAssignedRecord(serverUser, assignedToId, {
      allowSalesRead: Boolean(checklist.walkthroughId),
    })
  ) {
    return readForbiddenResponse();
  }

  const items = await prisma.checklistItem.findMany({
    where: { checklistId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: checklistItemSelect,
  });

  return NextResponse.json({ data: items });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { checklistId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    select: {
      id: true,
      workOrderId: true,
      walkthroughId: true,
      title: true,
      workOrder: { select: { assignedToId: true } },
      walkthrough: { select: { assignedToId: true } },
    },
  });
  if (!checklist) {
    return jsonError("Checklist not found.", 404);
  }

  const assignedToId =
    checklist.workOrder?.assignedToId ?? checklist.walkthrough?.assignedToId ?? null;
  if (!canAccessAssignedRecord(serverUser, assignedToId)) {
    return writeForbiddenResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = parseChecklistItemCreatePayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  try {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.checklistItem.create({
        data: {
          checklistId,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          isCompleted: parsed.data.isCompleted ?? false,
          sortOrder: parsed.data.sortOrder ?? 0,
          isRequired: parsed.data.isRequired ?? true,
          completedAt: parsed.data.completedAt ?? null,
          resultNotes: parsed.data.resultNotes ?? null,
          assignedToId: serverUser.id,
        },
        select: checklistItemSelect,
      });

      const target = checklistActivityTarget(checklist);
      if (target) {
        await logActivity({
          client: tx,
          actorUserId: serverUser.id,
          ...target,
          action: "checklist.item_created",
          message: `Checklist item created in ${checklist.title}`,
          metadataJson: {
            checklistId: checklist.id,
            checklistItemId: created.id,
            title: created.title,
          },
        });
      }

      return created;
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create checklist item.";
    if (message.includes("not found")) {
      return jsonError(message, 404);
    }

    console.error("Failed to create checklist item", error);
    return jsonError("Unable to create checklist item.", 500);
  }
}
