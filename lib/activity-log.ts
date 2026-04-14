import { ActivityEntityType, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ActivityLogClient = PrismaClient | Prisma.TransactionClient;

type LogActivityInput = {
  client?: ActivityLogClient;
  actorUserId?: string | null;
  entityType: ActivityEntityType;
  entityId: string;
  action: string;
  message?: string | null;
  metadataJson?: Prisma.InputJsonValue;

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

export async function logActivity(input: LogActivityInput) {
  const client = input.client ?? prisma;

  return client.activityLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      message: input.message ?? null,
      metadataJson: input.metadataJson,

      leadId: input.leadId ?? null,
      customerId: input.customerId ?? null,
      contactId: input.contactId ?? null,
      siteId: input.siteId ?? null,
      walkthroughId: input.walkthroughId ?? null,
      estimateId: input.estimateId ?? null,
      workOrderId: input.workOrderId ?? null,
      scheduleEventId: input.scheduleEventId ?? null,
      contractId: input.contractId ?? null,
      assetId: input.assetId ?? null,
      invoiceId: input.invoiceId ?? null,
    },
  });
}
