import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NoteEntityType } from "@prisma/client";
import {
  canAccessAssignedRecord,
  isAdmin,
  isSales,
  readForbiddenResponse,
  resolveServerUser,
} from "@/lib/serverUser";
import { ensureNoteEntityExists, resolveNoteEntityAssignedToId } from "@/app/api/execution/entities";
import { noteSelect } from "@/app/api/execution/selects";
import { jsonError } from "@/app/api/execution/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const noteAuthoritySelect = {
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

  const noteAuthority = await prisma.note.findFirst({
    where: { id, organizationId: serverUser.organizationId },
    select: noteAuthoritySelect,
  });

  if (!noteAuthority) {
    return jsonError("Note not found.", 404);
  }

  const entityCheck = await ensureNoteEntityExists(
    prisma,
    noteAuthority.entityType,
    noteAuthority.entityId,
    serverUser.organizationId
  );
  if (!entityCheck.ok) {
    return jsonError(entityCheck.message, 404);
  }

  const assignedToId = await resolveNoteEntityAssignedToId(
    prisma,
    noteAuthority.entityType,
    noteAuthority.entityId,
    serverUser.organizationId
  );

  const salesReadable =
    noteAuthority.entityType === NoteEntityType.walkthrough ||
    noteAuthority.entityType === NoteEntityType.estimate;

  if (
    !isAdmin(serverUser) &&
    !(isSales(serverUser) && salesReadable) &&
    !canAccessAssignedRecord(serverUser, assignedToId)
  ) {
    return readForbiddenResponse();
  }

  const note = await prisma.note.findFirst({
    where: { id, organizationId: serverUser.organizationId },
    select: noteSelect,
  });
  if (!note) {
    return jsonError("Note not found.", 404);
  }

  return NextResponse.json({ data: note });
}
