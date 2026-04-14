import { ActivityEntityType, LeadStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import {
  canCreateLead,
  canReadLead,
  isAdmin,
  isSales,
  resolveServerUser,
  readForbiddenResponse,
  writeForbiddenResponse,
} from "@/lib/serverUser";
import {
  jsonError,
  leadSelect,
  leadStatusValues,
  parseLeadCreatePayload,
} from "./_shared";

export async function GET(request: NextRequest) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const statusFilter = request.nextUrl.searchParams.get("status");

  if (statusFilter && !leadStatusValues.includes(statusFilter as LeadStatus)) {
    return jsonError("Query parameter \"status\" is invalid.", 400);
  }

  if (
    !isAdmin(serverUser) &&
    !isSales(serverUser) &&
    serverUser.role !== "operations_manager" &&
    serverUser.role !== "support"
  ) {
    return readForbiddenResponse();
  }

  const where = {
    ...(statusFilter ? { status: statusFilter as LeadStatus } : {}),
    ...(!isAdmin(serverUser) && !isSales(serverUser)
      ? { assignedToId: serverUser.id }
      : {}),
  };

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: leadSelect,
  });

  return NextResponse.json({
    data: leads,
    meta: {
      statuses: leadStatusValues,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  if (!canCreateLead(serverUser)) {
    return writeForbiddenResponse();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = parseLeadCreatePayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const createInput = {
    ...parsed.data,
    assignedToId: serverUser.id,
    status: parsed.data.status ?? LeadStatus.new,
  };

  try {
    const lead = await prisma.$transaction(async (tx) => {
      const createdLead = await tx.lead.create({
        data: createInput,
        select: leadSelect,
      });

      await logActivity({
        client: tx,
        actorUserId: serverUser.id,
        entityType: ActivityEntityType.lead,
        entityId: createdLead.id,
        action: "lead.created",
        message: "Lead created",
        metadataJson: { status: createdLead.status },
        leadId: createdLead.id,
      });

      return createdLead;
    });

    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error) {
    console.error("Failed to create lead", error);
    return jsonError("Unable to create lead.", 500);
  }
}
