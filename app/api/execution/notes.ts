import { NoteEntityType, NoteType } from "@prisma/client";
import {
  ParseResult,
  ensureAllowedKeys,
  parseEnumValue,
  parseOptionalBoolean,
  parseRequiredString,
  toObject,
} from "./validation";

export const noteEntityTypeValues = Object.values(NoteEntityType);
export const noteTypeValues = Object.values(NoteType);

export type NoteCreateInput = {
  entityType: NoteEntityType;
  entityId: string;
  noteType?: NoteType;
  content: string;
  isInternal?: boolean;
};

const noteAllowedKeys = new Set([
  "entityType",
  "entityId",
  "createdById",
  "noteType",
  "content",
  "isInternal",
]);

export function parseNoteCreatePayload(
  rawBody: unknown
): ParseResult<NoteCreateInput> {
  const body = toObject(rawBody);
  if (!body) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const allowed = ensureAllowedKeys(body, noteAllowedKeys);
  if (!allowed.ok) return allowed;

  if (!("entityType" in body) || !("entityId" in body) || !("content" in body)) {
    return {
      ok: false,
      message:
        'Fields "entityType", "entityId", and "content" are required.',
    };
  }

  const entityType = parseEnumValue("entityType", body.entityType, noteEntityTypeValues);
  if (!entityType.ok) return entityType;

  const entityId = parseRequiredString("entityId", body.entityId);
  if (!entityId.ok) return entityId;

  const content = parseRequiredString("content", body.content);
  if (!content.ok) return content;

  const parsed: NoteCreateInput = {
    entityType: entityType.data,
    entityId: entityId.data,
    content: content.data,
  };

  if ("noteType" in body) {
    const noteType = parseEnumValue("noteType", body.noteType, noteTypeValues);
    if (!noteType.ok) return noteType;
    parsed.noteType = noteType.data;
  }

  if ("isInternal" in body) {
    const isInternal = parseOptionalBoolean("isInternal", body.isInternal);
    if (!isInternal.ok) return isInternal;
    parsed.isInternal = isInternal.data;
  }

  return { ok: true, data: parsed };
}

export function parseNotesQuery(
  params: URLSearchParams
): ParseResult<{ entityType: NoteEntityType; entityId: string }> {
  const entityTypeParam = params.get("entityType");
  const entityIdParam = params.get("entityId");

  if (!entityTypeParam || !entityIdParam) {
    return {
      ok: false,
      message:
        'Query parameters "entityType" and "entityId" are required for listing notes.',
    };
  }

  const entityType = parseEnumValue("entityType", entityTypeParam, noteEntityTypeValues);
  if (!entityType.ok) return entityType;

  const entityId = parseRequiredString("entityId", entityIdParam);
  if (!entityId.ok) return entityId;

  return { ok: true, data: { entityType: entityType.data, entityId: entityId.data } };
}
