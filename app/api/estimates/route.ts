import { ActivityEntityType, EstimateStatus, LeadStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import {
  canMutateLead,
  canReadLead,
  isAdmin,
  isOperationsOrSupport,
  isSales,
  readForbiddenResponse,
  resolveServerUser,
  type ServerUser,
  writeForbiddenResponse,
} from "@/lib/serverUser";
import { jsonError } from "@/app/api/execution/validation";
import {
  estimateLifecycleFields,
  estimateSelect,
  estimateStatusValues,
  parseEstimateCreatePayload,
  parseEstimatesQuery,
} from "./_shared";

const nonQuotableLeadStatuses = new Set<LeadStatus>([
  LeadStatus.lost,
  LeadStatus.archived,
]);

function canMutateWalkthrough(
  serverUser: ServerUser,
  assignedToId: string | null
) {
  if (isAdmin(serverUser) || isSales(serverUser)) {
    return true;
  }

  if (isOperationsOrSupport(serverUser)) {
    return Boolean(assignedToId) && assignedToId === serverUser.id;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  if (
    !isAdmin(serverUser) &&
    !isSales(serverUser) &&
    !isOperationsOrSupport(serverUser)
  ) {
    return readForbiddenResponse();
  }

  const parsedQuery = parseEstimatesQuery(request.nextUrl.searchParams);
  if (!parsedQuery.ok) {
    return jsonError(parsedQuery.message, 400);
  }

  if (parsedQuery.data.leadId) {
    const lead = await prisma.lead.findFirst({
      where: {
        id: parsedQuery.data.leadId,
        organizationId: serverUser.organizationId,
      },
      select: { id: true, assignedToId: true },
    });

    if (!lead) {
      return jsonError("Lead not found.", 404);
    }

    if (!canReadLead(serverUser, lead.assignedToId)) {
      return readForbiddenResponse();
    }
  }

  const estimates = await prisma.estimate.findMany({
    where: {
      organizationId: serverUser.organizationId,
      ...(parsedQuery.data.status ? { status: parsedQuery.data.status } : {}),
      ...(parsedQuery.data.leadId ? { leadId: parsedQuery.data.leadId } : {}),
      ...(!isAdmin(serverUser) && !isSales(serverUser)
        ? { lead: { assignedToId: serverUser.id } }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    select: estimateSelect,
  });

  return NextResponse.json({
    data: estimates,
    meta: {
      statuses: estimateStatusValues,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  if (
    !isAdmin(serverUser) &&
    !isSales(serverUser) &&
    !isOperationsOrSupport(serverUser)
  ) {
    return writeForbiddenResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = parseEstimateCreatePayload(body, {
    requireLeadId: true,
    allowLeadId: true,
    allowWalkthroughId: true,
  });
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const inputLeadId = parsed.data.leadId;
  const inputWalkthroughId = parsed.data.walkthroughId ?? null;

  if (!inputLeadId) {
    return jsonError('Field "leadId" is required for estimate ownership.', 400);
  }

  const inputLead = await prisma.lead.findFirst({
    where: {
      id: inputLeadId,
      organizationId: serverUser.organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      status: true,
      assignedToId: true,
    },
  });

  if (!inputLead) {
    return jsonError("Lead not found.", 404);
  }

  if (!canMutateLead(serverUser, inputLead.assignedToId)) {
    return writeForbiddenResponse();
  }

  if (nonQuotableLeadStatuses.has(inputLead.status)) {
    return jsonError(
      "Cannot create an estimate for archived or lost lead origins.",
      409
    );
  }

  const walkthrough = inputWalkthroughId
    ? await prisma.walkthrough.findFirst({
        where: {
          id: inputWalkthroughId,
          organizationId: serverUser.organizationId,
        },
        select: {
          id: true,
          leadId: true,
          assignedToId: true,
        },
      })
    : null;

  if (inputWalkthroughId && !walkthrough) {
    return jsonError("Walkthrough not found.", 404);
  }

  if (walkthrough && walkthrough.leadId === null) {
    return jsonError(
      "Walkthrough must be linked to the same lead before attaching to an estimate.",
      409
    );
  }

  if (walkthrough && walkthrough.leadId !== inputLead.id) {
    return jsonError(
      "Walkthrough origin does not match the provided lead origin.",
      409
    );
  }

  if (walkthrough && !canMutateWalkthrough(serverUser, walkthrough.assignedToId)) {
    return writeForbiddenResponse();
  }

  const status = parsed.data.status ?? EstimateStatus.draft;
  const timestamps = estimateLifecycleFields(status);

  try {
    const estimate = await prisma.$transaction(async (tx) => {
      const createdEstimate = await tx.estimate.create({
        data: {
          organizationId: inputLead.organizationId,
          leadId: inputLead.id,
          walkthroughId: walkthrough?.id ?? null,
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
        message: "Estimate created with governed origin linkage",
        metadataJson: {
          estimateStatus: createdEstimate.status,
          leadId: createdEstimate.leadId,
          walkthroughId: createdEstimate.walkthroughId,
        },
        estimateId: createdEstimate.id,
        leadId: createdEstimate.leadId,
        walkthroughId: createdEstimate.walkthroughId ?? null,
      });

      await logActivity({
        client: tx,
        actorUserId: serverUser.id,
        entityType: ActivityEntityType.lead,
        entityId: createdEstimate.leadId,
        action: "lead.estimate_created",
        message: "Lead estimate created",
        metadataJson: {
          estimateId: createdEstimate.id,
          estimateStatus: createdEstimate.status,
        },
        leadId: createdEstimate.leadId,
        estimateId: createdEstimate.id,
      });

      if (createdEstimate.walkthroughId) {
        await logActivity({
          client: tx,
          actorUserId: serverUser.id,
          entityType: ActivityEntityType.walkthrough,
          entityId: createdEstimate.walkthroughId,
          action: "walkthrough.estimate_created",
          message: "Walkthrough estimate created",
          metadataJson: {
            estimateId: createdEstimate.id,
            estimateStatus: createdEstimate.status,
          },
          walkthroughId: createdEstimate.walkthroughId,
          estimateId: createdEstimate.id,
        });
      }

      return createdEstimate;
    });

    return NextResponse.json({ data: estimate }, { status: 201 });
  } catch (error) {
    console.error("Failed to create estimate", error);
    return jsonError("Unable to create estimate.", 500);
  }
}
