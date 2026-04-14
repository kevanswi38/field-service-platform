-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "assetTag" TEXT,
ADD COLUMN     "decommissionedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "preferredContactMethod" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "customerNumber" TEXT,
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "convertedToWorkOrderAt" TIMESTAMP(3),
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "revisionNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "leadNumber" TEXT,
ADD COLUMN     "lostAt" TIMESTAMP(3),
ADD COLUMN     "lostReason" TEXT,
ADD COLUMN     "nextActionAt" TIMESTAMP(3),
ADD COLUMN     "qualifiedAt" TIMESTAMP(3),
ADD COLUMN     "wonAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ScheduleEvent" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "siteCode" TEXT,
ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employeeCode" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "Walkthrough" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "resolutionSummary" TEXT;

-- CreateIndex
CREATE INDEX "ActivityLog_actorUserId_createdAt_idx" ON "ActivityLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_action_createdAt_idx" ON "ActivityLog"("entityType", "action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetTag_key" ON "Asset"("assetTag");

-- CreateIndex
CREATE INDEX "Asset_siteId_createdAt_idx" ON "Asset"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "Contact_customerId_isPrimary_idx" ON "Contact"("customerId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerNumber_key" ON "Customer"("customerNumber");

-- CreateIndex
CREATE INDEX "Customer_isActive_createdAt_idx" ON "Customer"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Estimate_status_createdAt_idx" ON "Estimate"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Estimate_customerId_idx" ON "Estimate"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_customerId_issuedAt_idx" ON "Invoice"("customerId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_leadNumber_key" ON "Lead"("leadNumber");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");

-- CreateIndex
CREATE INDEX "ScheduleEvent_assignedToId_startsAt_idx" ON "ScheduleEvent"("assignedToId", "startsAt");

-- CreateIndex
CREATE INDEX "ScheduleEvent_status_startsAt_idx" ON "ScheduleEvent"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Site_customerId_isActive_idx" ON "Site"("customerId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeCode_key" ON "User"("employeeCode");

-- CreateIndex
CREATE INDEX "Walkthrough_status_scheduledStart_idx" ON "Walkthrough"("status", "scheduledStart");

-- CreateIndex
CREATE INDEX "Walkthrough_leadId_idx" ON "Walkthrough"("leadId");

-- CreateIndex
CREATE INDEX "WorkOrder_status_scheduledStart_idx" ON "WorkOrder"("status", "scheduledStart");

-- CreateIndex
CREATE INDEX "WorkOrder_customerId_siteId_idx" ON "WorkOrder"("customerId", "siteId");

