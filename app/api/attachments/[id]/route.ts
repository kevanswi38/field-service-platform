import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttachmentEntityType } from "@prisma/client";
import {
  canAccessAssignedRecord,
  isAdmin,
  isSales,
  readForbiddenResponse,
  resolveServerUser,
} from "@/lib/serverUser";
import {
  ensureAttachmentEntityExists,
  resolveAttachmentEntityAssignedToId,
} from "@/app/api/execution/entities";
import { attachmentSelect } from "@/app/api/execution/selects";
import { jsonError } from "@/app/api/execution/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const attachmentAuthoritySelect = {
  id: true,
  entityType: true,
  entityId: true,
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await resolveServerUser(_request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const { id } = await context.params;

  const attachmentAuthority = await prisma.attachment.findFirst({
    where: { id, organizationId: serverUser.organizationId },
    select: attachmentAuthoritySelect,
  });

  if (!attachmentAuthority) {
    return jsonError("Attachment not found.", 404);
  }

  const entityCheck = await ensureAttachmentEntityExists(
    prisma,
    attachmentAuthority.entityType,
    attachmentAuthority.entityId,
    serverUser.organizationId
  );
  if (!entityCheck.ok) {
    return jsonError(entityCheck.message, 404);
  }

  const assignedToId = await resolveAttachmentEntityAssignedToId(
    prisma,
    attachmentAuthority.entityType,
    attachmentAuthority.entityId,
    serverUser.organizationId
  );

  const salesReadable =
    attachmentAuthority.entityType === AttachmentEntityType.walkthrough ||
    attachmentAuthority.entityType === AttachmentEntityType.estimate;

  if (
    !isAdmin(serverUser) &&
    !(isSales(serverUser) && salesReadable) &&
    !canAccessAssignedRecord(serverUser, assignedToId)
  ) {
    return readForbiddenResponse();
  }

  const attachment = await prisma.attachment.findFirst({
    where: { id, organizationId: serverUser.organizationId },
    select: attachmentSelect,
  });
  if (!attachment) {
    return jsonError("Attachment not found.", 404);
  }

  return NextResponse.json({ data: attachment });
}
