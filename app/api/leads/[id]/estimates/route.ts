import { ActivityEntityType, EstimateStatus, LeadStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import {
  canMutateLead,
  canReadLead,
  resolveServerUser,
  readForbiddenResponse,
  writeForbiddenResponse,
} from "@/lib/serverUser";
import { jsonError } from "@/app/api/execution/validation";
import {
  estimateLifecycleFields,
  estimateSelect,
  estimateStatusValues,
  parseEstimateCreatePayload,
  parseEstimatesQuery,
} from "@/app/api/estimates/_shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const nonQuotableLeadStatuses = new Set<LeadStatus>([
  LeadStatus.lost,
  LeadStatus.archived,
]);

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;
  const { id } = await context.params;

  const parsedQuery = parseEstimatesQuery(request.nextUrl.searchParams);
  if (!parsedQuery.ok) {
    return jsonError(parsedQuery.message, 400);
  }

  if (parsedQuery.data.leadId && parsedQuery.data.leadId !== id) {
    return jsonError('Query parameter "leadId" must match the route lead id.', 400);
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, assignedToId: true },
  });
  if (!lead) {
    return jsonError("Lead not found.", 404);
  }

  if (!canReadLead(serverUser, lead.assignedToId)) {
    return readForbiddenResponse();
  }

  const estimates = await prisma.estimate.findMany({
    where: {
      leadId: lead.id,
      ...(parsedQuery.data.status ? { status: parsedQuery.data.status } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    select: estimateSelect,
  });

  return NextResponse.json({
    data: estimates,
    meta: {
      statuses: estimateStatusValues,
      leadId: lead.id,
    },
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = parseEstimateCreatePayload(body, {
    allowLeadId: false,
    allowWalkthroughId: false,
  });
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      id: true,
      assignedToId: true,
      status: true,
    },
  });
  if (!lead) {
    return jsonError("Lead not found.", 404);
  }

  if (!canMutateLead(serverUser, lead.assignedToId)) {
    return writeForbiddenResponse();
  }

  if (nonQuotableLeadStatuses.has(lead.status)) {
    return jsonError("Cannot create an estimate for archived or lost leads.", 409);
  }

  const status = parsed.data.status ?? EstimateStatus.draft;
  const timestamps = estimateLifecycleFields(status);

  try {
    const estimate = await prisma.$transaction(async (tx) => {
      const createdEstimate = await tx.estimate.create({
        data: {
          leadId: lead.id,
          title: parsed.data.title ?? null,
          description: parsed.data.description ?? null,
          total: parsed.data.total ?? null,
          status,
          expiresAt: parsed.data.expiresAt ?? null,
          sentAt: timestamps.sentAt,
          approvedAt: timestamps.approvedAt,
          rejectedAt: timestamps.rejectedAt,
        },
        select: estimateSelect,
      });

      await logActivity({
        client: tx,
        actorUserId: serverUser.id,
        entityType: ActivityEntityType.estimate,
        entityId: createdEstimate.id,
        action: "estimate.created",
        message: "Estimate created from lead context",
        metadataJson: {
          estimateStatus: createdEstimate.status,
          leadId: createdEstimate.leadId,
        },
        estimateId: createdEstimate.id,
        leadId: lead.id,
      });

      await logActivity({
        client: tx,
        actorUserId: serverUser.id,
        entityType: ActivityEntityType.lead,
        entityId: lead.id,
        action: "lead.estimate_created",
        message: "Lead estimate created",
        metadataJson: {
          estimateId: createdEstimate.id,
          estimateStatus: createdEstimate.status,
        },
        leadId: lead.id,
        estimateId: createdEstimate.id,
      });

      return createdEstimate;
    });

    return NextResponse.json({ data: estimate }, { status: 201 });
  } catch (error) {
    console.error("Failed to create lead estimate", error);
    return jsonError("Unable to create estimate.", 500);
  }
}
