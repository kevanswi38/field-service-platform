import { LeadStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const writableLeadFields = [
  "companyName",
  "contactName",
  "email",
  "phone",
  "serviceType",
  "source",
  "notes",
] as const;

type WritableLeadField = (typeof writableLeadFields)[number];

const allowedLeadPayloadKeys = new Set<string>([
  ...writableLeadFields,
  "status",
]);

export const leadStatusValues = Object.values(LeadStatus);

export const leadSelect = {
  id: true,
  companyName: true,
  contactName: true,
  email: true,
  phone: true,
  serviceType: true,
  source: true,
  notes: true,
  status: true,
  nextActionAt: true,
  convertedAt: true,
  wonAt: true,
  lostAt: true,
  assignedToId: true,
  customerId: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      customerNumber: true,
    },
  },
} satisfies Prisma.LeadSelect;

export type LeadRecord = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

export type LeadCreateInput = {
  status?: LeadStatus;
} & Partial<Record<WritableLeadField, string | null>>;

export type LeadPatchInput = LeadCreateInput;

type ParseResult<T> = { ok: true; data: T } | { ok: false; message: string };

function toObject(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  return input as Record<string, unknown>;
}

function normalizeLeadTextField(
  field: WritableLeadField,
  value: unknown
): ParseResult<string | null> {
  if (value === null) {
    return { ok: true, data: null };
  }

  if (typeof value !== "string") {
    return { ok: false, message: `Field "${field}" must be a string or null.` };
  }

  const trimmed = value.trim();
  return { ok: true, data: trimmed.length > 0 ? trimmed : null };
}

function parseLeadPayload(
  rawBody: unknown,
  mode: "create" | "patch"
): ParseResult<LeadCreateInput> {
  const body = toObject(rawBody);
  if (!body) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  for (const key of Object.keys(body)) {
    if (!allowedLeadPayloadKeys.has(key)) {
      return { ok: false, message: `Unsupported field "${key}" in payload.` };
    }
  }

  const parsed: LeadCreateInput = {};

  for (const field of writableLeadFields) {
    if (!(field in body)) {
      continue;
    }

    const normalized = normalizeLeadTextField(field, body[field]);
    if (!normalized.ok) {
      return normalized;
    }

    parsed[field] = normalized.data;
  }

  if ("status" in body) {
    const status = body.status;
    if (typeof status !== "string" || !leadStatusValues.includes(status as LeadStatus)) {
      return { ok: false, message: "Field \"status\" is invalid." };
    }

    parsed.status = status as LeadStatus;
  }

  if (mode === "create") {
    const hasPrimaryIdentity = [parsed.companyName, parsed.contactName, parsed.email, parsed.phone].some(
      (value) => typeof value === "string" && value.length > 0
    );

    if (!hasPrimaryIdentity) {
      return {
        ok: false,
        message: "Provide at least one lead identity field: companyName, contactName, email, or phone.",
      };
    }
  }

  if (mode === "patch" && Object.keys(parsed).length === 0) {
    return { ok: false, message: "No valid fields were provided for update." };
  }

  return { ok: true, data: parsed };
}

export function parseLeadCreatePayload(rawBody: unknown): ParseResult<LeadCreateInput> {
  return parseLeadPayload(rawBody, "create");
}

export function parseLeadPatchPayload(rawBody: unknown): ParseResult<LeadPatchInput> {
  return parseLeadPayload(rawBody, "patch");
}

export function leadChangedKeys(existing: LeadRecord, patch: LeadPatchInput) {
  const keys = Object.keys(patch) as Array<keyof LeadPatchInput>;
  return keys.filter((key) => patch[key] !== existing[key as keyof LeadRecord]);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: { message } }, { status });
}
