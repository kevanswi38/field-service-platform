import { TaskPriority, TaskStatus } from "@prisma/client";
import { TaskRecord } from "./selects";
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

export const taskStatusValues = Object.values(TaskStatus);
export const taskPriorityValues = Object.values(TaskPriority);

export type TaskCreateInput = {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  taskType?: string;
  sortOrder?: number;
  isRequired?: boolean;
  dueAt?: Date | null;
  completedAt?: Date | null;
  resultNotes?: string | null;
  assetId?: string | null;
  templateId?: string | null;
};

export type TaskPatchInput = Partial<TaskCreateInput>;

const taskAllowedKeys = new Set([
  "title",
  "description",
  "status",
  "priority",
  "taskType",
  "sortOrder",
  "isRequired",
  "dueAt",
  "completedAt",
  "resultNotes",
  "assignedToId",
  "assetId",
  "templateId",
]);

export function parseTaskCreatePayload(
  rawBody: unknown
): ParseResult<TaskCreateInput> {
  const body = toObject(rawBody);
  if (!body) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const allowed = ensureAllowedKeys(body, taskAllowedKeys);
  if (!allowed.ok) {
    return allowed;
  }

  if (!("title" in body)) {
    return { ok: false, message: 'Field "title" is required.' };
  }

  const title = parseRequiredString("title", body.title);
  if (!title.ok) {
    return title;
  }

  const parsed: TaskCreateInput = { title: title.data };

  if ("description" in body) {
    const description = parseOptionalNullableString("description", body.description);
    if (!description.ok) return description;
    parsed.description = description.data;
  }

  if ("status" in body) {
    const status = parseEnumValue("status", body.status, taskStatusValues);
    if (!status.ok) return status;
    parsed.status = status.data;
  }

  if ("priority" in body) {
    const priority = parseEnumValue("priority", body.priority, taskPriorityValues);
    if (!priority.ok) return priority;
    parsed.priority = priority.data;
  }

  if ("taskType" in body) {
    const taskType = parseRequiredString("taskType", body.taskType);
    if (!taskType.ok) return taskType;
    parsed.taskType = taskType.data;
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

  if ("dueAt" in body) {
    const dueAt = parseOptionalDate("dueAt", body.dueAt);
    if (!dueAt.ok) return dueAt;
    parsed.dueAt = dueAt.data;
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

  if ("assetId" in body) {
    const assetId = parseOptionalNullableString("assetId", body.assetId);
    if (!assetId.ok) return assetId;
    parsed.assetId = assetId.data;
  }

  if ("templateId" in body) {
    const templateId = parseOptionalNullableString("templateId", body.templateId);
    if (!templateId.ok) return templateId;
    parsed.templateId = templateId.data;
  }

  return { ok: true, data: parsed };
}

export function parseTaskPatchPayload(
  rawBody: unknown
): ParseResult<TaskPatchInput> {
  const parsed = parseTaskCreatePayload(rawBody);
  if (!parsed.ok) {
    return parsed;
  }

  if (Object.keys(parsed.data).length === 0) {
    return { ok: false, message: "No valid fields were provided for update." };
  }

  return { ok: true, data: parsed.data };
}

export function taskChangedKeys(existing: TaskRecord, patch: TaskPatchInput) {
  const keys = Object.keys(patch) as Array<keyof TaskPatchInput>;
  return keys.filter((key) => {
    const next = patch[key];
    if (key === "dueAt" || key === "completedAt") {
      return !areDatesEqual(existing[key], next as Date | null | undefined);
    }

    return existing[key] !== next;
  });
}

export function parseTaskStatusQuery(
  statusParam: string | null
): ParseResult<TaskStatus | null> {
  if (!statusParam) {
    return { ok: true, data: null };
  }

  const parsed = parseEnumValue("status", statusParam, taskStatusValues);
  if (!parsed.ok) {
    return parsed;
  }

  return { ok: true, data: parsed.data };
}
