import { AttachmentEntityType } from "@prisma/client";
import {
  ParseResult,
  ensureAllowedKeys,
  parseEnumValue,
  parseOptionalBoolean,
  parseOptionalInteger,
  parseOptionalNullableString,
  parseRequiredString,
  toObject,
} from "./validation";

export const attachmentEntityTypeValues = Object.values(AttachmentEntityType);

export type AttachmentCreateInput = {
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  mimeType: string;
  fileSizeBytes: number;
  caption?: string | null;
  category?: string | null;
  sortOrder?: number | null;
  isPrimary?: boolean;
};

const attachmentAllowedKeys = new Set([
  "entityType",
  "entityId",
  "fileName",
  "fileUrl",
  "fileType",
  "mimeType",
  "fileSizeBytes",
  "uploadedById",
  "caption",
  "category",
  "sortOrder",
  "isPrimary",
]);

export function parseAttachmentCreatePayload(
  rawBody: unknown
): ParseResult<AttachmentCreateInput> {
  const body = toObject(rawBody);
  if (!body) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const allowed = ensureAllowedKeys(body, attachmentAllowedKeys);
  if (!allowed.ok) return allowed;

  const requiredFields = [
    "entityType",
    "entityId",
    "fileName",
    "fileUrl",
    "fileType",
    "mimeType",
    "fileSizeBytes",
  ];
  for (const field of requiredFields) {
    if (!(field in body)) {
      return { ok: false, message: `Field "${field}" is required.` };
    }
  }

  const entityType = parseEnumValue(
    "entityType",
    body.entityType,
    attachmentEntityTypeValues
  );
  if (!entityType.ok) return entityType;

  const entityId = parseRequiredString("entityId", body.entityId);
  if (!entityId.ok) return entityId;
  const fileName = parseRequiredString("fileName", body.fileName);
  if (!fileName.ok) return fileName;
  const fileUrl = parseRequiredString("fileUrl", body.fileUrl);
  if (!fileUrl.ok) return fileUrl;
  const fileType = parseRequiredString("fileType", body.fileType);
  if (!fileType.ok) return fileType;
  const mimeType = parseRequiredString("mimeType", body.mimeType);
  if (!mimeType.ok) return mimeType;
  const fileSizeBytes = parseOptionalInteger("fileSizeBytes", body.fileSizeBytes, {
    min: 0,
  });
  if (!fileSizeBytes.ok) return fileSizeBytes;

  const parsed: AttachmentCreateInput = {
    entityType: entityType.data,
    entityId: entityId.data,
    fileName: fileName.data,
    fileUrl: fileUrl.data,
    fileType: fileType.data,
    mimeType: mimeType.data,
    fileSizeBytes: fileSizeBytes.data,
  };

  if ("caption" in body) {
    const caption = parseOptionalNullableString("caption", body.caption);
    if (!caption.ok) return caption;
    parsed.caption = caption.data;
  }

  if ("category" in body) {
    const category = parseOptionalNullableString("category", body.category);
    if (!category.ok) return category;
    parsed.category = category.data;
  }

  if ("sortOrder" in body) {
    if (body.sortOrder === null) {
      parsed.sortOrder = null;
    } else {
      const sortOrder = parseOptionalInteger("sortOrder", body.sortOrder);
      if (!sortOrder.ok) return sortOrder;
      parsed.sortOrder = sortOrder.data;
    }
  }

  if ("isPrimary" in body) {
    const isPrimary = parseOptionalBoolean("isPrimary", body.isPrimary);
    if (!isPrimary.ok) return isPrimary;
    parsed.isPrimary = isPrimary.data;
  }

  return { ok: true, data: parsed };
}

export function parseAttachmentsQuery(
  params: URLSearchParams
): ParseResult<{ entityType: AttachmentEntityType; entityId: string }> {
  const entityTypeParam = params.get("entityType");
  const entityIdParam = params.get("entityId");

  if (!entityTypeParam || !entityIdParam) {
    return {
      ok: false,
      message:
        'Query parameters "entityType" and "entityId" are required for listing attachments.',
    };
  }

  const entityType = parseEnumValue(
    "entityType",
    entityTypeParam,
    attachmentEntityTypeValues
  );
  if (!entityType.ok) return entityType;

  const entityId = parseRequiredString("entityId", entityIdParam);
  if (!entityId.ok) return entityId;

  return {
    ok: true,
    data: { entityType: entityType.data, entityId: entityId.data },
  };
}
