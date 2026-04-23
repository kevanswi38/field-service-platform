import { ActivityEntityType, Prisma } from "@prisma/client";
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
import {
  jsonError,
  leadChangedKeys,
  leadSelect,
  parseLeadPatchPayload,
} from "../_shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await resolveServerUser(_request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  const { id } = await context.params;

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: serverUser.organizationId },
    select: leadSelect,
  });

  if (!lead) {
    return jsonError("Lead not found.", 404);
  }

  if (!canReadLead(serverUser, lead.assignedToId)) {
    return readForbiddenResponse();
  }

  return NextResponse.json({ data: lead });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await resolveServerUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const serverUser = auth.data;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = parseLeadPatchPayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const existingLead = await prisma.lead.findFirst({
    where: { id, organizationId: serverUser.organizationId },
    select: leadSelect,
  });

  if (!existingLead) {
    return jsonError("Lead not found.", 404);
  }

  if (!canMutateLead(serverUser, existingLead.assignedToId)) {
    return writeForbiddenResponse();
  }

  const changedKeys = leadChangedKeys(existingLead, parsed.data);
  if (changedKeys.length === 0) {
    return jsonError("No changes detected for this lead.", 400);
  }

  const statusChanged = changedKeys.includes("status");
  const nonStatusChanged = changedKeys.some((key) => key !== "status");

  const updateInput: Prisma.LeadUpdateInput = {};
  for (const key of changedKeys) {
    switch (key) {
      case "companyName":
        updateInput.companyName = parsed.data.companyName ?? null;
        break;
      case "contactName":
        updateInput.contactName = parsed.data.contactName ?? null;
        break;
      case "email":
        updateInput.email = parsed.data.email ?? null;
        break;
      case "phone":
        updateInput.phone = parsed.data.phone ?? null;
        break;
      case "serviceType":
        updateInput.serviceType = parsed.data.serviceType ?? null;
        break;
      case "source":
        updateInput.source = parsed.data.source ?? null;
        break;
      case "notes":
        updateInput.notes = parsed.data.notes ?? null;
        break;
      case "status":
        updateInput.status = parsed.data.status;
        break;
      default:
        break;
    }
  }

  try {
    const updatedLead = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: updateInput,
        select: leadSelect,
      });

      if (statusChanged) {
        await logActivity({
          client: tx,
          actorUserId: serverUser.id,
          entityType: ActivityEntityType.lead,
          entityId: lead.id,
          action: "lead.status_changed",
          message: `Lead status changed from ${existingLead.status} to ${lead.status}`,
          metadataJson: {
            from: existingLead.status,
            to: lead.status,
          },
          leadId: lead.id,
        });
      }

      if (nonStatusChanged) {
        await logActivity({
          client: tx,
          actorUserId: serverUser.id,
          entityType: ActivityEntityType.lead,
          entityId: lead.id,
          action: "lead.updated",
          message: "Lead details updated",
          metadataJson: {
            changedKeys: changedKeys.filter((key) => key !== "status"),
          },
          leadId: lead.id,
        });
      }

      return lead;
    });

    return NextResponse.json({ data: updatedLead });
  } catch (error) {
    console.error("Failed to update lead", error);
    return jsonError("Unable to update lead.", 500);
  }
}
