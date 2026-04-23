import { NextRequest, NextResponse } from "next/server";
import { AttachmentEntityType } from "@prisma/client";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import {
  canAccessAssignedRecord,
  isAdmin,
  isSales,
  resolveServerUser,
  readForbiddenResponse,
  writeForbiddenResponse,
} from "@/lib/serverUser";
import {
  attachmentActivityTarget,
  ensureAttachmentEntityExists,
  resolveAttachmentEntityAssignedToId,
} from "@/app/api/execution/entities";
import { attachmentSelect } from "@/app/api/execution/selects";
import {
  parseAttachmentCreatePayload,
  parseAttachmentsQuery,
} from "@/app/api/execution/attachments";
import { jsonError } from "@/app/api/execution/validation";

export async function GET(request: NextRequest) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const parsedQuery = parseAttachmentsQuery(request.nextUrl.searchParams);
  if (!parsedQuery.ok) {
    return jsonError(parsedQuery.message, 400);
  }

  const entityCheck = await ensureAttachmentEntityExists(
    prisma,
    parsedQuery.data.entityType,
    parsedQuery.data.entityId,
    serverUser.organizationId
  );
  if (!entityCheck.ok) {
    return jsonError(entityCheck.message, 404);
  }

  const assignedToId = await resolveAttachmentEntityAssignedToId(
    prisma,
    parsedQuery.data.entityType,
    parsedQuery.data.entityId,
    serverUser.organizationId
  );

  const salesReadable =
    parsedQuery.data.entityType === AttachmentEntityType.walkthrough ||
    parsedQuery.data.entityType === AttachmentEntityType.estimate;

  if (
    !isAdmin(serverUser) &&
    !(isSales(serverUser) && salesReadable) &&
    !canAccessAssignedRecord(serverUser, assignedToId)
  ) {
    return readForbiddenResponse();
  }

  const attachments = await prisma.attachment.findMany({
    where: {
      organizationId: serverUser.organizationId,
      entityType: parsedQuery.data.entityType,
      entityId: parsedQuery.data.entityId,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: attachmentSelect,
  });

  return NextResponse.json({ data: attachments });
}

export async function POST(request: NextRequest) {
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

  const parsed = parseAttachmentCreatePayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const entityCheck = await ensureAttachmentEntityExists(
    prisma,
    parsed.data.entityType,
    parsed.data.entityId,
    serverUser.organizationId
  );
  if (!entityCheck.ok) {
    return jsonError(entityCheck.message, 404);
  }

  const assignedToId = await resolveAttachmentEntityAssignedToId(
    prisma,
    parsed.data.entityType,
    parsed.data.entityId,
    serverUser.organizationId
  );
  const salesWritable =
    parsed.data.entityType === AttachmentEntityType.walkthrough ||
    parsed.data.entityType === AttachmentEntityType.estimate;

  if (
    !isAdmin(serverUser) &&
    !(isSales(serverUser) && salesWritable) &&
    !canAccessAssignedRecord(serverUser, assignedToId)
  ) {
    return writeForbiddenResponse();
  }

  try {
    const attachment = await prisma.$transaction(async (tx) => {
      const created = await tx.attachment.create({
        data: {
          organizationId: serverUser.organizationId,
          entityType: parsed.data.entityType,
          entityId: parsed.data.entityId,
          fileName: parsed.data.fileName,
          fileUrl: parsed.data.fileUrl,
          fileType: parsed.data.fileType,
          mimeType: parsed.data.mimeType,
          fileSizeBytes: parsed.data.fileSizeBytes,
          uploadedById: serverUser.id,
          caption: parsed.data.caption ?? null,
          category: parsed.data.category ?? null,
          sortOrder: parsed.data.sortOrder ?? null,
          isPrimary: parsed.data.isPrimary ?? false,
        },
        select: attachmentSelect,
      });

      const activityTarget = attachmentActivityTarget(
        created.entityType,
        created.entityId
      );

      await logActivity({
        client: tx,
        actorUserId: serverUser.id,
        ...activityTarget,
        action: "attachment.added",
        message: "Attachment metadata added",
        metadataJson: {
          attachmentId: created.id,
          attachmentEntityType: created.entityType,
          attachmentEntityId: created.entityId,
          fileName: created.fileName,
          fileType: created.fileType,
          mimeType: created.mimeType,
          fileSizeBytes: created.fileSizeBytes,
        },
      });

      return created;
    });

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create attachment.";
    if (message.includes("not found")) {
      return jsonError(message, 404);
    }

    console.error("Failed to create attachment", error);
    return jsonError("Unable to create attachment.", 500);
  }
}
