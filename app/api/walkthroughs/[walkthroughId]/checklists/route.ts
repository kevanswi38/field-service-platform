import { ActivityEntityType, ChecklistStatus, Prisma } from "@prisma/client";
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
  ensureOptionalTemplateExists,
} from "@/app/api/execution/entities";
import { checklistSelect } from "@/app/api/execution/selects";
import {
  checklistStatusValues,
  parseChecklistCreatePayload,
  parseChecklistStatusQuery,
} from "@/app/api/execution/checklists";
import { jsonError } from "@/app/api/execution/validation";

type RouteContext = {
  params: Promise<{ walkthroughId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { walkthroughId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const walkthrough = await prisma.walkthrough.findFirst({
    where: { id: walkthroughId, organizationId: serverUser.organizationId },
    select: { id: true, assignedToId: true },
  });
  if (!walkthrough) {
    return jsonError("Walkthrough not found.", 404);
  }

  if (
    !canReadAssignedRecord(serverUser, walkthrough.assignedToId, {
      allowSalesRead: true,
    })
  ) {
    return readForbiddenResponse();
  }

  const status = parseChecklistStatusQuery(request.nextUrl.searchParams.get("status"));
  if (!status.ok) {
    return jsonError(status.message, 400);
  }

  const checklists = await prisma.checklist.findMany({
    where: {
      organizationId: serverUser.organizationId,
      walkthroughId,
      status: status.data ?? undefined,
    },
    orderBy: [{ createdAt: "asc" }],
    select: checklistSelect,
  });

  return NextResponse.json({
    data: checklists,
    meta: {
      statuses: checklistStatusValues,
    },
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { walkthroughId } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const walkthrough = await prisma.walkthrough.findFirst({
    where: { id: walkthroughId, organizationId: serverUser.organizationId },
    select: { id: true, assignedToId: true },
  });
  if (!walkthrough) {
    return jsonError("Walkthrough not found.", 404);
  }

  if (!canAccessAssignedRecord(serverUser, walkthrough.assignedToId)) {
    return writeForbiddenResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = parseChecklistCreatePayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const nextStatus = parsed.data.status ?? ChecklistStatus.draft;
  const nextCompletedAt = parsed.data.completedAt ?? null;
  if (nextStatus !== ChecklistStatus.completed && nextCompletedAt !== null) {
    return jsonError(
      'Field "completedAt" can only be set when checklist status is "completed".',
      409
    );
  }

  const resolvedCompletedAt =
    nextStatus === ChecklistStatus.completed ? nextCompletedAt ?? new Date() : null;

  try {
    const checklist = await prisma.$transaction(async (tx) => {
      const templateCheck = await ensureOptionalTemplateExists(
        tx,
        parsed.data.templateId
      );
      if (!templateCheck.ok) {
        throw new Error(templateCheck.message);
      }

      const createData: Prisma.ChecklistUncheckedCreateInput = {
        organizationId: serverUser.organizationId,
        walkthroughId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: nextStatus,
        templateId: parsed.data.templateId ?? null,
        completedAt: resolvedCompletedAt,
      };

      const created = await tx.checklist.create({
        data: createData,
        select: checklistSelect,
      });

      await logActivity({
        client: tx,
        actorUserId: serverUser.id,
        entityType: ActivityEntityType.walkthrough,
        entityId: walkthroughId,
        action: "checklist.created",
        message: `Checklist created: ${created.title}`,
        metadataJson: {
          checklistId: created.id,
          status: created.status,
        },
        walkthroughId,
      });

      if (created.status === ChecklistStatus.completed) {
        await logActivity({
          client: tx,
          actorUserId: serverUser.id,
          entityType: ActivityEntityType.walkthrough,
          entityId: walkthroughId,
          action: "checklist.completed",
          message: `Checklist completed: ${created.title}`,
          metadataJson: {
            checklistId: created.id,
            completedAt: created.completedAt?.toISOString() ?? null,
          },
          walkthroughId,
        });
      }

      return created;
    });

    return NextResponse.json({ data: checklist }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create checklist.";
    if (message.includes("not found")) {
      return jsonError(message, 404);
    }

    console.error("Failed to create checklist", error);
    return jsonError("Unable to create checklist.", 500);
  }
}
