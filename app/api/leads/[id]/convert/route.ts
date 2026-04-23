import { ActivityEntityType, EstimateStatus, LeadStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import {
  isAdmin,
  isSales,
  resolveServerUser,
  type ServerUser,
  writeForbiddenResponse,
} from "@/lib/serverUser";
import {
  ParseResult,
  ensureAllowedKeys,
  jsonError,
  parseOptionalNullableString,
  parseRequiredString,
  toObject,
} from "@/app/api/execution/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type LeadConversionInput = {
  estimateId?: string;
  siteId?: string;
  workOrderTitle?: string | null;
  workOrderDescription?: string | null;
};

const convertibleLeadStatuses = new Set<LeadStatus>([
  LeadStatus.qualified,
  LeadStatus.walkthrough_needed,
  LeadStatus.quoted,
]);

const conversionAllowedKeys = new Set([
  "estimateId",
  "siteId",
  "workOrderTitle",
  "workOrderDescription",
]);

function canConvertLead(serverUser: ServerUser, assignedToId: string | null) {
  if (isAdmin(serverUser) || isSales(serverUser)) {
    return true;
  }

  if (serverUser.role === "operations_manager") {
    return Boolean(assignedToId) && assignedToId === serverUser.id;
  }

  return false;
}

function parseLeadConversionPayload(rawBody: unknown): ParseResult<LeadConversionInput> {
  const body = toObject(rawBody);
  if (!body) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const allowed = ensureAllowedKeys(body, conversionAllowedKeys);
  if (!allowed.ok) {
    return allowed;
  }

  const parsed: LeadConversionInput = {};

  if ("estimateId" in body) {
    const estimateId = parseRequiredString("estimateId", body.estimateId);
    if (!estimateId.ok) return estimateId;
    parsed.estimateId = estimateId.data;
  }

  if ("siteId" in body) {
    const siteId = parseRequiredString("siteId", body.siteId);
    if (!siteId.ok) return siteId;
    parsed.siteId = siteId.data;
  }

  if ("workOrderTitle" in body) {
    const workOrderTitle = parseOptionalNullableString("workOrderTitle", body.workOrderTitle);
    if (!workOrderTitle.ok) return workOrderTitle;
    parsed.workOrderTitle = workOrderTitle.data;
  }

  if ("workOrderDescription" in body) {
    const workOrderDescription = parseOptionalNullableString(
      "workOrderDescription",
      body.workOrderDescription
    );
    if (!workOrderDescription.ok) return workOrderDescription;
    parsed.workOrderDescription = workOrderDescription.data;
  }

  return { ok: true, data: parsed };
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

  const parsed = parseLeadConversionPayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400);
  }

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: serverUser.organizationId },
    select: {
      id: true,
      organizationId: true,
      status: true,
      assignedToId: true,
      customerId: true,
      convertedWorkOrderId: true,
      companyName: true,
      contactName: true,
      serviceType: true,
      email: true,
      phone: true,
      notes: true,
      convertedAt: true,
      wonAt: true,
    },
  });
  if (!lead) {
    return jsonError("Lead not found.", 404);
  }

  if (!canConvertLead(serverUser, lead.assignedToId)) {
    return writeForbiddenResponse();
  }

  if (!convertibleLeadStatuses.has(lead.status)) {
    return jsonError("Lead is not in a convertible workflow status.", 409);
  }

  const selectedEstimate = parsed.data.estimateId
    ? await prisma.estimate.findFirst({
        where: {
          organizationId: serverUser.organizationId,
          id: parsed.data.estimateId,
          leadId: lead.id,
          status: EstimateStatus.approved,
        },
        select: {
          id: true,
          leadId: true,
          walkthroughId: true,
          status: true,
          title: true,
          description: true,
          convertedToWorkOrderAt: true,
        },
      })
    : await prisma.estimate.findFirst({
        where: {
          organizationId: serverUser.organizationId,
          leadId: lead.id,
          status: EstimateStatus.approved,
        },
        orderBy: [{ approvedAt: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          leadId: true,
          walkthroughId: true,
          status: true,
          title: true,
          description: true,
          convertedToWorkOrderAt: true,
        },
      });

  if (!selectedEstimate) {
    return jsonError("Approved estimate is required before conversion.", 409);
  }

  if (selectedEstimate.status !== EstimateStatus.approved) {
    return jsonError("Only approved estimates can be converted into work orders.", 409);
  }

  const existingWorkOrder = await prisma.workOrder.findFirst({
    where: {
      estimateId: selectedEstimate.id,
      organizationId: serverUser.organizationId,
    },
    select: { id: true, workOrderNumber: true, status: true },
  });

  if (existingWorkOrder || selectedEstimate.convertedToWorkOrderAt) {
    return jsonError("This estimate has already been converted to a work order.", 409);
  }

  try {
    const conversion = await prisma.$transaction(async (tx) => {
      const customer =
        lead.customerId !== null
          ? await tx.customer.findFirst({
              where: {
                id: lead.customerId,
                organizationId: lead.organizationId,
              },
              select: { id: true, name: true, customerNumber: true },
            })
          : null;

      const resolvedCustomer =
        customer ??
        (await tx.customer.create({
          data: {
            organizationId: lead.organizationId,
            name:
              lead.companyName?.trim() ||
              lead.contactName?.trim() ||
              `Lead ${lead.id.slice(-6)}`,
            billingEmail: lead.email ?? null,
            billingPhone: lead.phone ?? null,
            notes: lead.notes ?? null,
          },
          select: { id: true, name: true, customerNumber: true },
        }));

      let resolvedSite = null as null | {
        id: string;
        name: string;
        siteCode: string | null;
      };

      if (parsed.data.siteId) {
        const site = await tx.site.findFirst({
          where: {
            id: parsed.data.siteId,
            organizationId: lead.organizationId,
          },
          select: { id: true, name: true, siteCode: true, customerId: true },
        });
        if (!site) {
          throw new Error("Selected site was not found.");
        }
        if (site.customerId !== resolvedCustomer.id) {
          throw new Error("Selected site does not belong to the resolved customer.");
        }
        resolvedSite = {
          id: site.id,
          name: site.name,
          siteCode: site.siteCode,
        };
      } else {
        const firstSite = await tx.site.findFirst({
          where: {
            organizationId: lead.organizationId,
            customerId: resolvedCustomer.id,
          },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, siteCode: true },
        });

        resolvedSite =
          firstSite ??
          (await tx.site.create({
            data: {
              organizationId: lead.organizationId,
              customerId: resolvedCustomer.id,
              name:
                lead.companyName?.trim() ||
                lead.contactName?.trim() ||
                `${resolvedCustomer.name} Primary Site`,
            },
            select: { id: true, name: true, siteCode: true },
          }));
      }

      const workOrder = await tx.workOrder.create({
        data: {
          organizationId: lead.organizationId,
          customerId: resolvedCustomer.id,
          siteId: resolvedSite.id,
          estimateId: selectedEstimate.id,
          assignedToId: lead.assignedToId ?? null,
          title:
            parsed.data.workOrderTitle ??
            selectedEstimate.title ??
            lead.serviceType ??
            `Service for ${resolvedCustomer.name}`,
          description:
            parsed.data.workOrderDescription ??
            selectedEstimate.description ??
            lead.notes ??
            null,
          serviceType: lead.serviceType ?? null,
        },
        select: {
          id: true,
          title: true,
          status: true,
          customerId: true,
          siteId: true,
          estimateId: true,
          assignedToId: true,
          createdAt: true,
        },
      });

      const now = new Date();
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          customerId: resolvedCustomer.id,
          status: LeadStatus.won,
          convertedAt: now,
          convertedWorkOrderId: workOrder.id,
          wonAt: lead.wonAt ?? now,
        },
        select: {
          id: true,
          status: true,
          customerId: true,
          convertedWorkOrderId: true,
          convertedAt: true,
          wonAt: true,
        },
      });

      const updatedEstimate = await tx.estimate.update({
        where: { id: selectedEstimate.id },
        data: {
          convertedToWorkOrderAt: now,
        },
        select: {
          id: true,
          status: true,
          convertedToWorkOrderAt: true,
        },
      });

      await logActivity({
        client: tx,
        actorUserId: serverUser.id,
        entityType: ActivityEntityType.lead,
        entityId: lead.id,
        action: "lead.converted",
        message: "Lead converted to work order",
        metadataJson: {
          estimateId: selectedEstimate.id,
          workOrderId: workOrder.id,
          customerId: resolvedCustomer.id,
          siteId: resolvedSite.id,
        },
        leadId: lead.id,
        estimateId: selectedEstimate.id,
        customerId: resolvedCustomer.id,
        siteId: resolvedSite.id,
        workOrderId: workOrder.id,
      });

      await logActivity({
        client: tx,
        actorUserId: serverUser.id,
        entityType: ActivityEntityType.estimate,
        entityId: selectedEstimate.id,
        action: "estimate.converted_to_work_order",
        message: "Estimate converted to work order",
        metadataJson: {
          leadId: lead.id,
          workOrderId: workOrder.id,
        },
        estimateId: selectedEstimate.id,
        leadId: lead.id,
        workOrderId: workOrder.id,
      });

      await logActivity({
        client: tx,
        actorUserId: serverUser.id,
        entityType: ActivityEntityType.work_order,
        entityId: workOrder.id,
        action: "work_order.created_from_lead_conversion",
        message: "Work order created from lead conversion",
        metadataJson: {
          leadId: lead.id,
          estimateId: selectedEstimate.id,
        },
        workOrderId: workOrder.id,
        leadId: lead.id,
        estimateId: selectedEstimate.id,
      });

      return {
        lead: updatedLead,
        estimate: updatedEstimate,
        customer: resolvedCustomer,
        site: resolvedSite,
        workOrder,
      };
    });

    return NextResponse.json({ data: conversion }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to convert lead.";
    if (message.includes("not found") || message.includes("does not belong")) {
      return jsonError(message, 404);
    }

    console.error("Lead conversion failed", error);
    return jsonError("Unable to convert lead.", 500);
  }
}
