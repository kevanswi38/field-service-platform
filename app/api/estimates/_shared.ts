import { EstimateStatus, Prisma } from "@prisma/client";
import {
  ParseResult,
  ensureAllowedKeys,
  parseEnumValue,
  parseOptionalDate,
  parseOptionalNullableString,
  parseRequiredString,
  toObject,
} from "@/app/api/execution/validation";

export const estimateStatusValues = Object.values(EstimateStatus);

export const estimateSelect = {
  id: true,
  estimateNumber: true,
  title: true,
  description: true,
  status: true,
  subtotal: true,
  tax: true,
  total: true,
  sentAt: true,
  approvedAt: true,
  rejectedAt: true,
  expiresAt: true,
  convertedToWorkOrderAt: true,
  leadId: true,
  walkthroughId: true,
  createdAt: true,
  updatedAt: true,
  lead: {
    select: {
      id: true,
      companyName: true,
      contactName: true,
      status: true,
      assignedToId: true,
      customer: {
        select: {
          id: true,
          name: true,
          customerNumber: true,
        },
      },
    },
  },
  walkthrough: {
    select: {
      id: true,
      title: true,
      status: true,
    },
  },
} satisfies Prisma.EstimateSelect;

type EstimateMutableFields = {
  title?: string | null;
  description?: string | null;
  total?: Prisma.Decimal | null;
  status?: EstimateStatus;
  expiresAt?: Date | null;
};

export type EstimateCreateInput = EstimateMutableFields & {
  leadId?: string;
  walkthroughId?: string;
};

const estimateCreateAllowedKeys = new Set([
  "leadId",
  "walkthroughId",
  "title",
  "description",
  "total",
  "status",
  "expiresAt",
]);

function parseOptionalDecimal(
  field: string,
  value: unknown
): ParseResult<Prisma.Decimal | null> {
  if (value === null) {
    return { ok: true, data: null };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { ok: false, message: `Field "${field}" must be a finite number.` };
    }

    return { ok: true, data: new Prisma.Decimal(value) };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return { ok: true, data: null };
    }

    try {
      return { ok: true, data: new Prisma.Decimal(trimmed) };
    } catch {
      return {
        ok: false,
        message: `Field "${field}" must be a valid decimal value.`,
      };
    }
  }

  return {
    ok: false,
    message: `Field "${field}" must be a number, decimal string, or null.`,
  };
}

export function parseEstimateCreatePayload(
  rawBody: unknown,
  options?: {
    requireLeadId?: boolean;
    allowLeadId?: boolean;
    allowWalkthroughId?: boolean;
  }
): ParseResult<EstimateCreateInput> {
  const body = toObject(rawBody);
  if (!body) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const allowed = ensureAllowedKeys(body, estimateCreateAllowedKeys);
  if (!allowed.ok) {
    return allowed;
  }

  const parsed: EstimateCreateInput = {};
  const canReadLeadId = options?.allowLeadId ?? true;
  const canReadWalkthroughId = options?.allowWalkthroughId ?? true;
  const requireLeadId = options?.requireLeadId ?? false;

  if ("leadId" in body) {
    if (!canReadLeadId) {
      return {
        ok: false,
        message: 'Field "leadId" is not allowed for this route.',
      };
    }

    const leadId = parseRequiredString("leadId", body.leadId);
    if (!leadId.ok) {
      return leadId;
    }

    parsed.leadId = leadId.data;
  }

  if ("walkthroughId" in body) {
    if (!canReadWalkthroughId) {
      return {
        ok: false,
        message: 'Field "walkthroughId" is not allowed for this route.',
      };
    }

    const walkthroughId = parseRequiredString("walkthroughId", body.walkthroughId);
    if (!walkthroughId.ok) {
      return walkthroughId;
    }

    parsed.walkthroughId = walkthroughId.data;
  }

  if (requireLeadId && !parsed.leadId) {
    return {
      ok: false,
      message: 'Field "leadId" is required for estimate ownership.',
    };
  }

  if ("title" in body) {
    const title = parseOptionalNullableString("title", body.title);
    if (!title.ok) return title;
    parsed.title = title.data;
  }

  if ("description" in body) {
    const description = parseOptionalNullableString("description", body.description);
    if (!description.ok) return description;
    parsed.description = description.data;
  }

  if ("total" in body) {
    const total = parseOptionalDecimal("total", body.total);
    if (!total.ok) return total;
    parsed.total = total.data;
  }

  if ("status" in body) {
    const status = parseEnumValue("status", body.status, estimateStatusValues);
    if (!status.ok) return status;
    parsed.status = status.data;
  }

  if ("expiresAt" in body) {
    const expiresAt = parseOptionalDate("expiresAt", body.expiresAt);
    if (!expiresAt.ok) return expiresAt;
    parsed.expiresAt = expiresAt.data;
  }

  return { ok: true, data: parsed };
}

export function parseEstimatesQuery(
  params: URLSearchParams
): ParseResult<{ status: EstimateStatus | null; leadId: string | null }> {
  const statusParam = params.get("status");
  const leadIdParam = params.get("leadId");

  let status: EstimateStatus | null = null;
  if (statusParam) {
    const parsedStatus = parseEnumValue("status", statusParam, estimateStatusValues);
    if (!parsedStatus.ok) {
      return parsedStatus;
    }

    status = parsedStatus.data;
  }

  let leadId: string | null = null;
  if (leadIdParam) {
    const parsedLeadId = parseRequiredString("leadId", leadIdParam);
    if (!parsedLeadId.ok) {
      return parsedLeadId;
    }

    leadId = parsedLeadId.data;
  }

  return {
    ok: true,
    data: {
      status,
      leadId,
    },
  };
}

export function estimateLifecycleFields(status: EstimateStatus) {
  const now = new Date();

  return {
    sentAt: status === EstimateStatus.sent ? now : null,
    approvedAt: status === EstimateStatus.approved ? now : null,
    rejectedAt: status === EstimateStatus.rejected ? now : null,
  };
}
