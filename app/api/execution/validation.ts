import { NextResponse } from "next/server";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; message: string };

export function toObject(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  return input as Record<string, unknown>;
}

export function ensureAllowedKeys(
  body: Record<string, unknown>,
  allowed: Set<string>
): ParseResult<true> {
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      return { ok: false, message: `Unsupported field "${key}" in payload.` };
    }
  }

  return { ok: true, data: true };
}

export function parseRequiredString(
  field: string,
  value: unknown
): ParseResult<string> {
  if (typeof value !== "string") {
    return { ok: false, message: `Field "${field}" must be a string.` };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: `Field "${field}" cannot be empty.` };
  }

  return { ok: true, data: trimmed };
}

export function parseOptionalNullableString(
  field: string,
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

export function parseOptionalBoolean(
  field: string,
  value: unknown
): ParseResult<boolean> {
  if (typeof value !== "boolean") {
    return { ok: false, message: `Field "${field}" must be a boolean.` };
  }

  return { ok: true, data: value };
}

export function parseOptionalInteger(
  field: string,
  value: unknown,
  options?: { min?: number }
): ParseResult<number> {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { ok: false, message: `Field "${field}" must be an integer.` };
  }

  if (typeof options?.min === "number" && value < options.min) {
    return {
      ok: false,
      message: `Field "${field}" must be greater than or equal to ${options.min}.`,
    };
  }

  return { ok: true, data: value };
}

export function parseOptionalDate(
  field: string,
  value: unknown
): ParseResult<Date | null> {
  if (value === null) {
    return { ok: true, data: null };
  }

  if (typeof value !== "string") {
    return {
      ok: false,
      message: `Field "${field}" must be an ISO datetime string or null.`,
    };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: true, data: null };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return {
      ok: false,
      message: `Field "${field}" must be a valid ISO datetime string.`,
    };
  }

  return { ok: true, data: parsed };
}

export function parseEnumValue<T extends string>(
  field: string,
  value: unknown,
  allowedValues: readonly T[]
): ParseResult<T> {
  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    return { ok: false, message: `Field "${field}" is invalid.` };
  }

  return { ok: true, data: value as T };
}

export function areDatesEqual(
  current: Date | null,
  next: Date | null | undefined
): boolean {
  if (typeof next === "undefined") {
    return true;
  }

  if (current === null && next === null) {
    return true;
  }

  if (!current || !next) {
    return false;
  }

  return current.getTime() === next.getTime();
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: { message } }, { status });
}
