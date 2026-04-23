import {
  ActivityEntityType,
  AttachmentEntityType,
  NoteEntityType,
  PlatformRole,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ParseResult } from "./validation";

type ApiClient = PrismaClient | Prisma.TransactionClient;

type ActivityTarget = {
  entityType: ActivityEntityType;
  entityId: string;
  leadId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  siteId?: string | null;
  walkthroughId?: string | null;
  estimateId?: string | null;
  workOrderId?: string | null;
  scheduleEventId?: string | null;
  contractId?: string | null;
  assetId?: string | null;
  invoiceId?: string | null;
};

async function existsById(
  client: ApiClient,
  model:
    | "user"
    | "workOrder"
    | "walkthrough"
    | "asset"
    | "template"
    | "checklist"
    | "task"
    | "scheduleEvent"
    | "site"
    | "estimate"
    | "invoice",
  id: string,
  organizationId?: string
) {
  switch (model) {
    case "template":
      return client.template.findUnique({ where: { id }, select: { id: true } });
    case "user":
      return client.user.findFirst({
        where: { id, organizationId: organizationId ?? "__missing_org__" },
        select: { id: true },
      });
    case "workOrder":
      return client.workOrder.findFirst({
        where: { id, organizationId: organizationId ?? "__missing_org__" },
        select: { id: true },
      });
    case "walkthrough":
      return client.walkthrough.findFirst({
        where: { id, organizationId: organizationId ?? "__missing_org__" },
        select: { id: true },
      });
    case "asset":
      return client.asset.findFirst({
        where: { id, organizationId: organizationId ?? "__missing_org__" },
        select: { id: true },
      });
    case "checklist":
      return client.checklist.findFirst({
        where: { id, organizationId: organizationId ?? "__missing_org__" },
        select: { id: true },
      });
    case "task":
      return client.task.findFirst({
        where: { id, organizationId: organizationId ?? "__missing_org__" },
        select: { id: true },
      });
    case "scheduleEvent":
      return client.scheduleEvent.findFirst({
        where: { id, organizationId: organizationId ?? "__missing_org__" },
        select: { id: true },
      });
    case "site":
      return client.site.findFirst({
        where: { id, organizationId: organizationId ?? "__missing_org__" },
        select: { id: true },
      });
    case "estimate":
      return client.estimate.findFirst({
        where: { id, organizationId: organizationId ?? "__missing_org__" },
        select: { id: true },
      });
    case "invoice":
      return client.invoice.findFirst({
        where: { id, organizationId: organizationId ?? "__missing_org__" },
        select: { id: true },
      });
    default:
      return null;
  }
}

export async function ensureWorkOrderExists(
  workOrderId: string,
  organizationId: string
): Promise<ParseResult<true>> {
  const found = await prisma.workOrder.findFirst({
    where: { id: workOrderId, organizationId },
    select: { id: true },
  });
  if (!found) return { ok: false, message: "Work order not found." };
  return { ok: true, data: true };
}

export async function ensureWalkthroughExists(
  walkthroughId: string,
  organizationId: string
): Promise<ParseResult<true>> {
  const found = await prisma.walkthrough.findFirst({
    where: { id: walkthroughId, organizationId },
    select: { id: true },
  });
  if (!found) return { ok: false, message: "Walkthrough not found." };
  return { ok: true, data: true };
}

export async function ensureChecklistExists(
  checklistId: string,
  organizationId: string
): Promise<ParseResult<true>> {
  const found = await prisma.checklist.findFirst({
    where: { id: checklistId, organizationId },
    select: { id: true },
  });
  if (!found) return { ok: false, message: "Checklist not found." };
  return { ok: true, data: true };
}

export async function ensureOptionalUserExists(
  client: ApiClient,
  userId: string | null | undefined,
  fieldName: string,
  organizationId: string
): Promise<ParseResult<true>> {
  if (!userId) return { ok: true, data: true };
  const found = await existsById(client, "user", userId, organizationId);
  if (!found) {
    return { ok: false, message: `Referenced "${fieldName}" user was not found.` };
  }
  return { ok: true, data: true };
}

const assignableWorkOrderRoles: PlatformRole[] = [
  PlatformRole.admin,
  PlatformRole.operations_manager,
  PlatformRole.support,
  PlatformRole.technician,
];

export async function ensureOptionalAssignableUserExists(
  client: ApiClient,
  userId: string | null | undefined,
  fieldName: string,
  organizationId: string
): Promise<ParseResult<true>> {
  if (!userId) return { ok: true, data: true };

  const found = await client.user.findFirst({
    where: {
      id: userId,
      organizationId,
      isActive: true,
      role: { in: assignableWorkOrderRoles },
    },
    select: { id: true },
  });

  if (!found) {
    return {
      ok: false,
      message: `Referenced "${fieldName}" user is not assignable in this organization.`,
    };
  }

  return { ok: true, data: true };
}

export async function ensureOptionalAssetExists(
  client: ApiClient,
  assetId: string | null | undefined,
  organizationId: string
): Promise<ParseResult<true>> {
  if (!assetId) return { ok: true, data: true };
  const found = await existsById(client, "asset", assetId, organizationId);
  if (!found) return { ok: false, message: 'Referenced "assetId" was not found.' };
  return { ok: true, data: true };
}

export async function ensureOptionalTemplateExists(
  client: ApiClient,
  templateId: string | null | undefined
): Promise<ParseResult<true>> {
  if (!templateId) return { ok: true, data: true };
  const found = await existsById(client, "template", templateId);
  if (!found) return { ok: false, message: 'Referenced "templateId" was not found.' };
  return { ok: true, data: true };
}

export async function ensureNoteEntityExists(
  client: ApiClient,
  entityType: NoteEntityType,
  entityId: string,
  organizationId: string
): Promise<ParseResult<true>> {
  let found: { id: string } | null = null;
  switch (entityType) {
    case NoteEntityType.work_order:
      found = await existsById(client, "workOrder", entityId, organizationId);
      break;
    case NoteEntityType.walkthrough:
      found = await existsById(client, "walkthrough", entityId, organizationId);
      break;
    case NoteEntityType.schedule_event:
      found = await existsById(client, "scheduleEvent", entityId, organizationId);
      break;
    case NoteEntityType.site:
      found = await existsById(client, "site", entityId, organizationId);
      break;
    case NoteEntityType.asset:
      found = await existsById(client, "asset", entityId, organizationId);
      break;
    case NoteEntityType.estimate:
      found = await existsById(client, "estimate", entityId, organizationId);
      break;
    case NoteEntityType.invoice:
      found = await existsById(client, "invoice", entityId, organizationId);
      break;
    case NoteEntityType.checklist:
      found = await existsById(client, "checklist", entityId, organizationId);
      break;
    case NoteEntityType.task:
      found = await existsById(client, "task", entityId, organizationId);
      break;
    default:
      found = null;
      break;
  }

  if (!found) {
    return { ok: false, message: "Referenced note entity was not found." };
  }
  return { ok: true, data: true };
}

export async function ensureAttachmentEntityExists(
  client: ApiClient,
  entityType: AttachmentEntityType,
  entityId: string,
  organizationId: string
): Promise<ParseResult<true>> {
  let found: { id: string } | null = null;
  switch (entityType) {
    case AttachmentEntityType.walkthrough:
      found = await existsById(client, "walkthrough", entityId, organizationId);
      break;
    case AttachmentEntityType.work_order:
      found = await existsById(client, "workOrder", entityId, organizationId);
      break;
    case AttachmentEntityType.asset:
      found = await existsById(client, "asset", entityId, organizationId);
      break;
    case AttachmentEntityType.site:
      found = await existsById(client, "site", entityId, organizationId);
      break;
    case AttachmentEntityType.estimate:
      found = await existsById(client, "estimate", entityId, organizationId);
      break;
    case AttachmentEntityType.invoice:
      found = await existsById(client, "invoice", entityId, organizationId);
      break;
    default:
      found = null;
      break;
  }

  if (!found) {
    return { ok: false, message: "Referenced attachment entity was not found." };
  }
  return { ok: true, data: true };
}

export async function resolveChecklistAssignedToId(
  client: ApiClient,
  checklistId: string,
  organizationId: string
): Promise<string | null> {
  const checklist = await client.checklist.findFirst({
    where: { id: checklistId, organizationId },
    select: {
      workOrder: { select: { assignedToId: true } },
      walkthrough: { select: { assignedToId: true } },
    },
  });

  if (!checklist) return null;
  return (
    checklist.workOrder?.assignedToId ??
    checklist.walkthrough?.assignedToId ??
    null
  );
}

export async function resolveNoteEntityAssignedToId(
  client: ApiClient,
  entityType: NoteEntityType,
  entityId: string,
  organizationId: string
): Promise<string | null> {
  switch (entityType) {
    case NoteEntityType.work_order: {
      const workOrder = await client.workOrder.findFirst({
        where: { id: entityId, organizationId },
        select: { assignedToId: true },
      });
      return workOrder?.assignedToId ?? null;
    }
    case NoteEntityType.walkthrough: {
      const walkthrough = await client.walkthrough.findFirst({
        where: { id: entityId, organizationId },
        select: { assignedToId: true },
      });
      return walkthrough?.assignedToId ?? null;
    }
    case NoteEntityType.schedule_event: {
      const event = await client.scheduleEvent.findFirst({
        where: { id: entityId, organizationId },
        select: { assignedToId: true },
      });
      return event?.assignedToId ?? null;
    }
    case NoteEntityType.checklist:
      return resolveChecklistAssignedToId(client, entityId, organizationId);
    case NoteEntityType.task: {
      const task = await client.task.findFirst({
        where: { id: entityId, organizationId },
        select: {
          assignedToId: true,
          workOrder: { select: { assignedToId: true } },
        },
      });
      if (!task) return null;
      return task.assignedToId ?? task.workOrder.assignedToId ?? null;
    }
    default:
      return null;
  }
}

export async function resolveAttachmentEntityAssignedToId(
  client: ApiClient,
  entityType: AttachmentEntityType,
  entityId: string,
  organizationId: string
): Promise<string | null> {
  switch (entityType) {
    case AttachmentEntityType.work_order: {
      const workOrder = await client.workOrder.findFirst({
        where: { id: entityId, organizationId },
        select: { assignedToId: true },
      });
      return workOrder?.assignedToId ?? null;
    }
    case AttachmentEntityType.walkthrough: {
      const walkthrough = await client.walkthrough.findFirst({
        where: { id: entityId, organizationId },
        select: { assignedToId: true },
      });
      return walkthrough?.assignedToId ?? null;
    }
    default:
      return null;
  }
}

export function checklistActivityTarget(input: {
  workOrderId: string | null;
  walkthroughId: string | null;
}): ActivityTarget | null {
  if (input.workOrderId) {
    return {
      entityType: ActivityEntityType.work_order,
      entityId: input.workOrderId,
      workOrderId: input.workOrderId,
    };
  }

  if (input.walkthroughId) {
    return {
      entityType: ActivityEntityType.walkthrough,
      entityId: input.walkthroughId,
      walkthroughId: input.walkthroughId,
    };
  }

  return null;
}

export function attachmentActivityTarget(
  entityType: AttachmentEntityType,
  entityId: string
): ActivityTarget {
  switch (entityType) {
    case AttachmentEntityType.work_order:
      return { entityType: ActivityEntityType.work_order, entityId, workOrderId: entityId };
    case AttachmentEntityType.walkthrough:
      return { entityType: ActivityEntityType.walkthrough, entityId, walkthroughId: entityId };
    case AttachmentEntityType.asset:
      return { entityType: ActivityEntityType.asset, entityId, assetId: entityId };
    case AttachmentEntityType.site:
      return { entityType: ActivityEntityType.site, entityId, siteId: entityId };
    case AttachmentEntityType.estimate:
      return { entityType: ActivityEntityType.estimate, entityId, estimateId: entityId };
    case AttachmentEntityType.invoice:
      return { entityType: ActivityEntityType.invoice, entityId, invoiceId: entityId };
    default:
      return { entityType: ActivityEntityType.work_order, entityId, workOrderId: entityId };
  }
}

export async function resolveNoteActivityTarget(
  client: ApiClient,
  entityType: NoteEntityType,
  entityId: string,
  organizationId: string
): Promise<ActivityTarget | null> {
  switch (entityType) {
    case NoteEntityType.work_order:
      return { entityType: ActivityEntityType.work_order, entityId, workOrderId: entityId };
    case NoteEntityType.walkthrough:
      return {
        entityType: ActivityEntityType.walkthrough,
        entityId,
        walkthroughId: entityId,
      };
    case NoteEntityType.schedule_event:
      return {
        entityType: ActivityEntityType.schedule_event,
        entityId,
        scheduleEventId: entityId,
      };
    case NoteEntityType.site:
      return { entityType: ActivityEntityType.site, entityId, siteId: entityId };
    case NoteEntityType.asset:
      return { entityType: ActivityEntityType.asset, entityId, assetId: entityId };
    case NoteEntityType.estimate:
      return { entityType: ActivityEntityType.estimate, entityId, estimateId: entityId };
    case NoteEntityType.invoice:
      return { entityType: ActivityEntityType.invoice, entityId, invoiceId: entityId };
    case NoteEntityType.task: {
      const task = await client.task.findFirst({
        where: { id: entityId, organizationId },
        select: { workOrderId: true },
      });
      if (!task) return null;
      return {
        entityType: ActivityEntityType.work_order,
        entityId: task.workOrderId,
        workOrderId: task.workOrderId,
      };
    }
    case NoteEntityType.checklist: {
      const checklist = await client.checklist.findFirst({
        where: { id: entityId, organizationId },
        select: { workOrderId: true, walkthroughId: true },
      });
      if (!checklist) return null;
      return checklistActivityTarget(checklist);
    }
    default:
      return null;
  }
}
