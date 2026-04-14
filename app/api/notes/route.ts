import { NextRequest, NextResponse } from "next/server";
import { NoteEntityType } from "@prisma/client";
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
  ensureNoteEntityExists,
  resolveNoteEntityAssignedToId,
  resolveNoteActivityTarget,
} from "@/app/api/execution/entities";
import { noteSelect } from "@/app/api/execution/selects";
import { parseNoteCreatePayload, parseNotesQuery } from "@/app/api/execution/notes";
import { jsonError } from "@/app/api/execution/validation";

export async function GET(request: NextRequest) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const parsedQuery = parseNotesQuery(request.nextUrl.searchParams);
  if (!parsedQuery.ok) {
    return jsonError(parsedQuery.message, 400);
  }

  const entityCheck = await ensureNoteEntityExists(
    prisma,
    parsedQuery.data.entityType,
    parsedQuery.data.entityId
  );
  if (!entityCheck.ok) {
    return jsonError(entityCheck.message, 404);
  }

  const assignedToId = await resolveNoteEntityAssignedToId(
    prisma,
    parsedQuery.data.entityType,
    parsedQuery.data.entityId
  );

  const salesReadable =
    parsedQuery.data.entityType === NoteEntityType.walkthrough ||
    parsedQuery.data.entityType === NoteEntityType.estimate;

  if (
    !isAdmin(serverUser) &&
    !(isSales(serverUser) && salesReadable) &&
    !canAccessAssignedRecord(serverUser, assignedToId)
  ) {
    return readForbiddenResponse();
  }

  const notes = await prisma.note.findMany({
    where: {
      entityType: parsedQuery.data.entityType,
      entityId: parsedQuery.data.entityId,
    },
    orderBy: [{ createdAt: "desc" }],
    select: noteSelect,
  });

  return NextResponse.json({ data: notes });
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

  const parsed = parseNoteCreatePayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const entityCheck = await ensureNoteEntityExists(
    prisma,
    parsed.data.entityType,
    parsed.data.entityId
  );
  if (!entityCheck.ok) {
    return jsonError(entityCheck.message, 404);
  }

  const assignedToId = await resolveNoteEntityAssignedToId(
    prisma,
    parsed.data.entityType,
    parsed.data.entityId
  );
  const salesWritable =
    parsed.data.entityType === NoteEntityType.walkthrough ||
    parsed.data.entityType === NoteEntityType.estimate;

  if (
    !isAdmin(serverUser) &&
    !(isSales(serverUser) && salesWritable) &&
    !canAccessAssignedRecord(serverUser, assignedToId)
  ) {
    return writeForbiddenResponse();
  }

  try {
    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.note.create({
        data: {
          entityType: parsed.data.entityType,
          entityId: parsed.data.entityId,
          createdById: serverUser.id,
          noteType: parsed.data.noteType ?? "general",
          content: parsed.data.content,
          isInternal: parsed.data.isInternal ?? true,
        },
        select: noteSelect,
      });

      const activityTarget = await resolveNoteActivityTarget(
        tx,
        created.entityType,
        created.entityId
      );

      if (activityTarget) {
        await logActivity({
          client: tx,
          actorUserId: serverUser.id,
          ...activityTarget,
          action: "note.added",
          message: "Operational note added",
          metadataJson: {
            noteId: created.id,
            noteEntityType: created.entityType,
            noteEntityId: created.entityId,
            noteType: created.noteType,
            isInternal: created.isInternal,
          },
        });
      }

      return created;
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create note.";
    if (message.includes("not found")) {
      return jsonError(message, 404);
    }

    console.error("Failed to create note", error);
    return jsonError("Unable to create note.", 500);
  }
}
