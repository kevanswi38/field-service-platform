import {
  ActivityEntityType,
  AttachmentEntityType,
  NoteEntityType,
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
  id: string
) {
  switch (model) {
    case "user":
      return client.user.findUnique({ where: { id }, select: { id: true } });
    case "workOrder":
      return client.workOrder.findUnique({ where: { id }, select: { id: true } });
    case "walkthrough":
      return client.walkthrough.findUnique({ where: { id }, select: { id: true } });
    case "asset":
      return client.asset.findUnique({ where: { id }, select: { id: true } });
    case "template":
      return client.template.findUnique({ where: { id }, select: { id: true } });
    case "checklist":
      return client.checklist.findUnique({ where: { id }, select: { id: true } });
    case "task":
      return client.task.findUnique({ where: { id }, select: { id: true } });
    case "scheduleEvent":
      return client.scheduleEvent.findUnique({ where: { id }, select: { id: true } });
    case "site":
      return client.site.findUnique({ where: { id }, select: { id: true } });
    case "estimate":
      return client.estimate.findUnique({ where: { id }, select: { id: true } });
    case "invoice":
      return client.invoice.findUnique({ where: { id }, select: { id: true } });
    default:
      return null;
  }
}

export async function ensureWorkOrderExists(
  workOrderId: string
): Promise<ParseResult<true>> {
  const found = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: { id: true },
  });
  if (!found) return { ok: false, message: "Work order not found." };
  return { ok: true, data: true };
}

export async function ensureWalkthroughExists(
  walkthroughId: string
): Promise<ParseResult<true>> {
  const found = await prisma.walkthrough.findUnique({
    where: { id: walkthroughId },
    select: { id: true },
  });
  if (!found) return { ok: false, message: "Walkthrough not found." };
  return { ok: true, data: true };
}

export async function ensureChecklistExists(
  checklistId: string
): Promise<ParseResult<true>> {
  const found = await prisma.checklist.findUnique({
    where: { id: checklistId },
    select: { id: true },
  });
  if (!found) return { ok: false, message: "Checklist not found." };
  return { ok: true, data: true };
}

export async function ensureOptionalUserExists(
  client: ApiClient,
  userId: string | null | undefined,
  fieldName: string
): Promise<ParseResult<true>> {
  if (!userId) return { ok: true, data: true };
  const found = await existsById(client, "user", userId);
  if (!found) {
    return { ok: false, message: `Referenced "${fieldName}" user was not found.` };
  }
  return { ok: true, data: true };
}

export async function ensureOptionalAssetExists(
  client: ApiClient,
  assetId: string | null | undefined
): Promise<ParseResult<true>> {
  if (!assetId) return { ok: true, data: true };
  const found = await existsById(client, "asset", assetId);
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
  entityId: string
): Promise<ParseResult<true>> {
  let found: { id: string } | null = null;
  switch (entityType) {
    case NoteEntityType.work_order:
      found = await existsById(client, "workOrder", entityId);
      break;
    case NoteEntityType.walkthrough:
      found = await existsById(client, "walkthrough", entityId);
      break;
    case NoteEntityType.schedule_event:
      found = await existsById(client, "scheduleEvent", entityId);
      break;
    case NoteEntityType.site:
      found = await existsById(client, "site", entityId);
      break;
    case NoteEntityType.asset:
      found = await existsById(client, "asset", entityId);
      break;
    case NoteEntityType.estimate:
      found = await existsById(client, "estimate", entityId);
      break;
    case NoteEntityType.invoice:
      found = await existsById(client, "invoice", entityId);
      break;
    case NoteEntityType.checklist:
      found = await existsById(client, "checklist", entityId);
      break;
    case NoteEntityType.task:
      found = await existsById(client, "task", entityId);
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
  entityId: string
): Promise<ParseResult<true>> {
  let found: { id: string } | null = null;
  switch (entityType) {
    case AttachmentEntityType.walkthrough:
      found = await existsById(client, "walkthrough", entityId);
      break;
    case AttachmentEntityType.work_order:
      found = await existsById(client, "workOrder", entityId);
      break;
    case AttachmentEntityType.asset:
      found = await existsById(client, "asset", entityId);
      break;
    case AttachmentEntityType.site:
      found = await existsById(client, "site", entityId);
      break;
    case AttachmentEntityType.estimate:
      found = await existsById(client, "estimate", entityId);
      break;
    case AttachmentEntityType.invoice:
      found = await existsById(client, "invoice", entityId);
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
  checklistId: string
): Promise<string | null> {
  const checklist = await client.checklist.findUnique({
    where: { id: checklistId },
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
  entityId: string
): Promise<string | null> {
  switch (entityType) {
    case NoteEntityType.work_order: {
      const workOrder = await client.workOrder.findUnique({
        where: { id: entityId },
        select: { assignedToId: true },
      });
      return workOrder?.assignedToId ?? null;
    }
    case NoteEntityType.walkthrough: {
      const walkthrough = await client.walkthrough.findUnique({
        where: { id: entityId },
        select: { assignedToId: true },
      });
      return walkthrough?.assignedToId ?? null;
    }
    case NoteEntityType.schedule_event: {
      const event = await client.scheduleEvent.findUnique({
        where: { id: entityId },
        select: { assignedToId: true },
      });
      return event?.assignedToId ?? null;
    }
    case NoteEntityType.checklist:
      return resolveChecklistAssignedToId(client, entityId);
    case NoteEntityType.task: {
      const task = await client.task.findUnique({
        where: { id: entityId },
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
  entityId: string
): Promise<string | null> {
  switch (entityType) {
    case AttachmentEntityType.work_order: {
      const workOrder = await client.workOrder.findUnique({
        where: { id: entityId },
        select: { assignedToId: true },
      });
      return workOrder?.assignedToId ?? null;
    }
    case AttachmentEntityType.walkthrough: {
      const walkthrough = await client.walkthrough.findUnique({
        where: { id: entityId },
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
  entityId: string
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
      const task = await client.task.findUnique({
        where: { id: entityId },
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
      const checklist = await client.checklist.findUnique({
        where: { id: entityId },
        select: { workOrderId: true, walkthroughId: true },
      });
      if (!checklist) return null;
      return checklistActivityTarget(checklist);
    }
    default:
      return null;
  }
}
