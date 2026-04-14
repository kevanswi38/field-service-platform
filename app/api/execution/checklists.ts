import { ChecklistStatus } from "@prisma/client";
import { ChecklistItemRecord, ChecklistRecord } from "./selects";
import {
  ParseResult,
  ensureAllowedKeys,
  parseEnumValue,
  parseOptionalBoolean,
  parseOptionalDate,
  parseOptionalInteger,
  parseOptionalNullableString,
  parseRequiredString,
  toObject,
  areDatesEqual,
} from "./validation";

export const checklistStatusValues = Object.values(ChecklistStatus);

export type ChecklistCreateInput = {
  title: string;
  description?: string | null;
  status?: ChecklistStatus;
  templateId?: string | null;
  completedAt?: Date | null;
};

export type ChecklistPatchInput = Partial<ChecklistCreateInput>;

const checklistAllowedKeys = new Set([
  "title",
  "description",
  "status",
  "templateId",
  "completedAt",
]);

export function parseChecklistCreatePayload(
  rawBody: unknown
): ParseResult<ChecklistCreateInput> {
  const body = toObject(rawBody);
  if (!body) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const allowed = ensureAllowedKeys(body, checklistAllowedKeys);
  if (!allowed.ok) {
    return allowed;
  }

  if (!("title" in body)) {
    return { ok: false, message: 'Field "title" is required.' };
  }

  const title = parseRequiredString("title", body.title);
  if (!title.ok) return title;

  const parsed: ChecklistCreateInput = { title: title.data };

  if ("description" in body) {
    const description = parseOptionalNullableString("description", body.description);
    if (!description.ok) return description;
    parsed.description = description.data;
  }

  if ("status" in body) {
    const status = parseEnumValue("status", body.status, checklistStatusValues);
    if (!status.ok) return status;
    parsed.status = status.data;
  }

  if ("templateId" in body) {
    const templateId = parseOptionalNullableString("templateId", body.templateId);
    if (!templateId.ok) return templateId;
    parsed.templateId = templateId.data;
  }

  if ("completedAt" in body) {
    const completedAt = parseOptionalDate("completedAt", body.completedAt);
    if (!completedAt.ok) return completedAt;
    parsed.completedAt = completedAt.data;
  }

  return { ok: true, data: parsed };
}

export function parseChecklistPatchPayload(
  rawBody: unknown
): ParseResult<ChecklistPatchInput> {
  const parsed = parseChecklistCreatePayload(rawBody);
  if (!parsed.ok) {
    return parsed;
  }

  if (Object.keys(parsed.data).length === 0) {
    return { ok: false, message: "No valid fields were provided for update." };
  }

  return { ok: true, data: parsed.data };
}

export function checklistChangedKeys(
  existing: ChecklistRecord,
  patch: ChecklistPatchInput
) {
  const keys = Object.keys(patch) as Array<keyof ChecklistPatchInput>;
  return keys.filter((key) => {
    const next = patch[key];
    if (key === "completedAt") {
      return !areDatesEqual(existing.completedAt, next as Date | null | undefined);
    }

    return existing[key] !== next;
  });
}

export type ChecklistItemCreateInput = {
  title: string;
  description?: string | null;
  isCompleted?: boolean;
  sortOrder?: number;
  isRequired?: boolean;
  completedAt?: Date | null;
  resultNotes?: string | null;
};

export type ChecklistItemPatchInput = Partial<ChecklistItemCreateInput>;

const checklistItemAllowedKeys = new Set([
  "title",
  "description",
  "isCompleted",
  "sortOrder",
  "isRequired",
  "completedAt",
  "resultNotes",
]);

export function parseChecklistItemCreatePayload(
  rawBody: unknown
): ParseResult<ChecklistItemCreateInput> {
  const body = toObject(rawBody);
  if (!body) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const allowed = ensureAllowedKeys(body, checklistItemAllowedKeys);
  if (!allowed.ok) return allowed;

  if (!("title" in body)) {
    return { ok: false, message: 'Field "title" is required.' };
  }

  const title = parseRequiredString("title", body.title);
  if (!title.ok) return title;

  const parsed: ChecklistItemCreateInput = { title: title.data };

  if ("description" in body) {
    const description = parseOptionalNullableString("description", body.description);
    if (!description.ok) return description;
    parsed.description = description.data;
  }

  if ("isCompleted" in body) {
    const isCompleted = parseOptionalBoolean("isCompleted", body.isCompleted);
    if (!isCompleted.ok) return isCompleted;
    parsed.isCompleted = isCompleted.data;
  }

  if ("sortOrder" in body) {
    const sortOrder = parseOptionalInteger("sortOrder", body.sortOrder);
    if (!sortOrder.ok) return sortOrder;
    parsed.sortOrder = sortOrder.data;
  }

  if ("isRequired" in body) {
    const isRequired = parseOptionalBoolean("isRequired", body.isRequired);
    if (!isRequired.ok) return isRequired;
    parsed.isRequired = isRequired.data;
  }

  if ("completedAt" in body) {
    const completedAt = parseOptionalDate("completedAt", body.completedAt);
    if (!completedAt.ok) return completedAt;
    parsed.completedAt = completedAt.data;
  }

  if ("resultNotes" in body) {
    const resultNotes = parseOptionalNullableString("resultNotes", body.resultNotes);
    if (!resultNotes.ok) return resultNotes;
    parsed.resultNotes = resultNotes.data;
  }

  return { ok: true, data: parsed };
}

export function parseChecklistItemPatchPayload(
  rawBody: unknown
): ParseResult<ChecklistItemPatchInput> {
  const parsed = parseChecklistItemCreatePayload(rawBody);
  if (!parsed.ok) return parsed;

  if (Object.keys(parsed.data).length === 0) {
    return { ok: false, message: "No valid fields were provided for update." };
  }

  return { ok: true, data: parsed.data };
}

export function checklistItemChangedKeys(
  existing: ChecklistItemRecord,
  patch: ChecklistItemPatchInput
) {
  const keys = Object.keys(patch) as Array<keyof ChecklistItemPatchInput>;
  return keys.filter((key) => {
    const next = patch[key];
    if (key === "completedAt") {
      return !areDatesEqual(existing.completedAt, next as Date | null | undefined);
    }

    return existing[key] !== next;
  });
}

export function parseChecklistStatusQuery(
  statusParam: string | null
): ParseResult<ChecklistStatus | null> {
  if (!statusParam) {
    return { ok: true, data: null };
  }

  const parsed = parseEnumValue("status", statusParam, checklistStatusValues);
  if (!parsed.ok) {
    return parsed;
  }

  return { ok: true, data: parsed.data };
}
