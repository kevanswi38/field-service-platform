-- Phase 6 - Organization foundation
-- Establish organization ownership across core operational records
-- without changing workflow meaning.

-- 1) Create top-level organization owner table.
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- 2) Create deterministic default organization for existing single-business data.
INSERT INTO "Organization" ("id", "name", "createdAt", "updatedAt")
VALUES ('org_default', 'Default Organization', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- 3) Add organization ownership columns (nullable for controlled backfill).
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Site" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Walkthrough" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Estimate" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ScheduleEvent" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Contract" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Asset" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Task" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Attachment" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Checklist" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ChecklistItem" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Note" ADD COLUMN "organizationId" TEXT;

-- 4) Deterministic ownership backfill.
UPDATE "User"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Customer"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Lead" AS l
SET "organizationId" = c."organizationId"
FROM "Customer" AS c
WHERE l."customerId" = c."id";
UPDATE "Lead" AS l
SET "organizationId" = u."organizationId"
FROM "User" AS u
WHERE l."organizationId" IS NULL
  AND l."assignedToId" = u."id";
UPDATE "Lead"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Site" AS s
SET "organizationId" = c."organizationId"
FROM "Customer" AS c
WHERE s."customerId" = c."id";
UPDATE "Site"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Contact" AS c
SET "organizationId" = cu."organizationId"
FROM "Customer" AS cu
WHERE c."customerId" = cu."id";
UPDATE "Contact" AS c
SET "organizationId" = s."organizationId"
FROM "Site" AS s
WHERE c."organizationId" IS NULL
  AND c."siteId" = s."id";
UPDATE "Contact"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Walkthrough" AS w
SET "organizationId" = l."organizationId"
FROM "Lead" AS l
WHERE w."leadId" = l."id";
UPDATE "Walkthrough" AS w
SET "organizationId" = c."organizationId"
FROM "Customer" AS c
WHERE w."organizationId" IS NULL
  AND w."customerId" = c."id";
UPDATE "Walkthrough" AS w
SET "organizationId" = s."organizationId"
FROM "Site" AS s
WHERE w."organizationId" IS NULL
  AND w."siteId" = s."id";
UPDATE "Walkthrough" AS w
SET "organizationId" = u."organizationId"
FROM "User" AS u
WHERE w."organizationId" IS NULL
  AND w."assignedToId" = u."id";
UPDATE "Walkthrough"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Estimate" AS e
SET "organizationId" = l."organizationId"
FROM "Lead" AS l
WHERE e."leadId" = l."id";
UPDATE "Estimate" AS e
SET "organizationId" = w."organizationId"
FROM "Walkthrough" AS w
WHERE e."organizationId" IS NULL
  AND e."walkthroughId" = w."id";
UPDATE "Estimate"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "WorkOrder" AS w
SET "organizationId" = e."organizationId"
FROM "Estimate" AS e
WHERE w."estimateId" = e."id";
UPDATE "WorkOrder" AS w
SET "organizationId" = c."organizationId"
FROM "Customer" AS c
WHERE w."organizationId" IS NULL
  AND w."customerId" = c."id";
UPDATE "WorkOrder" AS w
SET "organizationId" = s."organizationId"
FROM "Site" AS s
WHERE w."organizationId" IS NULL
  AND w."siteId" = s."id";
UPDATE "WorkOrder"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "ScheduleEvent" AS se
SET "organizationId" = w."organizationId"
FROM "WorkOrder" AS w
WHERE se."workOrderId" = w."id";
UPDATE "ScheduleEvent" AS se
SET "organizationId" = u."organizationId"
FROM "User" AS u
WHERE se."organizationId" IS NULL
  AND se."assignedToId" = u."id";
UPDATE "ScheduleEvent"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Contract" AS c
SET "organizationId" = cu."organizationId"
FROM "Customer" AS cu
WHERE c."customerId" = cu."id";
UPDATE "Contract"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Asset" AS a
SET "organizationId" = s."organizationId"
FROM "Site" AS s
WHERE a."siteId" = s."id";
UPDATE "Asset"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Invoice" AS i
SET "organizationId" = c."organizationId"
FROM "Customer" AS c
WHERE i."customerId" = c."id";
UPDATE "Invoice" AS i
SET "organizationId" = w."organizationId"
FROM "WorkOrder" AS w
WHERE i."workOrderId" = w."id";
UPDATE "Invoice"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Task" AS t
SET "organizationId" = w."organizationId"
FROM "WorkOrder" AS w
WHERE t."workOrderId" = w."id";
UPDATE "Task" AS t
SET "organizationId" = a."organizationId"
FROM "Asset" AS a
WHERE t."organizationId" IS NULL
  AND t."assetId" = a."id";
UPDATE "Task" AS t
SET "organizationId" = u."organizationId"
FROM "User" AS u
WHERE t."organizationId" IS NULL
  AND t."assignedToId" = u."id";
UPDATE "Task"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Checklist" AS c
SET "organizationId" = w."organizationId"
FROM "WorkOrder" AS w
WHERE c."workOrderId" = w."id";
UPDATE "Checklist" AS c
SET "organizationId" = wt."organizationId"
FROM "Walkthrough" AS wt
WHERE c."organizationId" IS NULL
  AND c."walkthroughId" = wt."id";
UPDATE "Checklist"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "ChecklistItem" AS ci
SET "organizationId" = c."organizationId"
FROM "Checklist" AS c
WHERE ci."checklistId" = c."id";
UPDATE "ChecklistItem" AS ci
SET "organizationId" = u."organizationId"
FROM "User" AS u
WHERE ci."organizationId" IS NULL
  AND ci."assignedToId" = u."id";
UPDATE "ChecklistItem"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Attachment" AS a
SET "organizationId" = w."organizationId"
FROM "Walkthrough" AS w
WHERE a."entityType" = 'walkthrough'::"AttachmentEntityType"
  AND a."entityId" = w."id";
UPDATE "Attachment" AS a
SET "organizationId" = w."organizationId"
FROM "WorkOrder" AS w
WHERE a."entityType" = 'work_order'::"AttachmentEntityType"
  AND a."entityId" = w."id";
UPDATE "Attachment" AS a
SET "organizationId" = at."organizationId"
FROM "Asset" AS at
WHERE a."entityType" = 'asset'::"AttachmentEntityType"
  AND a."entityId" = at."id";
UPDATE "Attachment" AS a
SET "organizationId" = s."organizationId"
FROM "Site" AS s
WHERE a."entityType" = 'site'::"AttachmentEntityType"
  AND a."entityId" = s."id";
UPDATE "Attachment" AS a
SET "organizationId" = e."organizationId"
FROM "Estimate" AS e
WHERE a."entityType" = 'estimate'::"AttachmentEntityType"
  AND a."entityId" = e."id";
UPDATE "Attachment" AS a
SET "organizationId" = i."organizationId"
FROM "Invoice" AS i
WHERE a."entityType" = 'invoice'::"AttachmentEntityType"
  AND a."entityId" = i."id";
UPDATE "Attachment" AS a
SET "organizationId" = u."organizationId"
FROM "User" AS u
WHERE a."organizationId" IS NULL
  AND a."uploadedById" = u."id";
UPDATE "Attachment"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "Note" AS n
SET "organizationId" = w."organizationId"
FROM "WorkOrder" AS w
WHERE n."entityType" = 'work_order'::"NoteEntityType"
  AND n."entityId" = w."id";
UPDATE "Note" AS n
SET "organizationId" = w."organizationId"
FROM "Walkthrough" AS w
WHERE n."entityType" = 'walkthrough'::"NoteEntityType"
  AND n."entityId" = w."id";
UPDATE "Note" AS n
SET "organizationId" = se."organizationId"
FROM "ScheduleEvent" AS se
WHERE n."entityType" = 'schedule_event'::"NoteEntityType"
  AND n."entityId" = se."id";
UPDATE "Note" AS n
SET "organizationId" = s."organizationId"
FROM "Site" AS s
WHERE n."entityType" = 'site'::"NoteEntityType"
  AND n."entityId" = s."id";
UPDATE "Note" AS n
SET "organizationId" = a."organizationId"
FROM "Asset" AS a
WHERE n."entityType" = 'asset'::"NoteEntityType"
  AND n."entityId" = a."id";
UPDATE "Note" AS n
SET "organizationId" = e."organizationId"
FROM "Estimate" AS e
WHERE n."entityType" = 'estimate'::"NoteEntityType"
  AND n."entityId" = e."id";
UPDATE "Note" AS n
SET "organizationId" = i."organizationId"
FROM "Invoice" AS i
WHERE n."entityType" = 'invoice'::"NoteEntityType"
  AND n."entityId" = i."id";
UPDATE "Note" AS n
SET "organizationId" = c."organizationId"
FROM "Checklist" AS c
WHERE n."entityType" = 'checklist'::"NoteEntityType"
  AND n."entityId" = c."id";
UPDATE "Note" AS n
SET "organizationId" = t."organizationId"
FROM "Task" AS t
WHERE n."entityType" = 'task'::"NoteEntityType"
  AND n."entityId" = t."id";
UPDATE "Note" AS n
SET "organizationId" = u."organizationId"
FROM "User" AS u
WHERE n."organizationId" IS NULL
  AND n."createdById" = u."id";
UPDATE "Note"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

-- 5) Fail fast if ownership or key org-consistency states are still invalid.
DO $$
DECLARE
  ownerless_count INTEGER;
  site_customer_mismatch_count INTEGER;
  estimate_lead_mismatch_count INTEGER;
  estimate_walkthrough_mismatch_count INTEGER;
  work_order_estimate_mismatch_count INTEGER;
  work_order_customer_mismatch_count INTEGER;
  work_order_site_mismatch_count INTEGER;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM "User" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Lead" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Customer" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Contact" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Site" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Walkthrough" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Estimate" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "WorkOrder" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "ScheduleEvent" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Contract" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Asset" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Invoice" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Task" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Attachment" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Checklist" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "ChecklistItem" WHERE "organizationId" IS NULL) +
    (SELECT COUNT(*) FROM "Note" WHERE "organizationId" IS NULL)
  INTO ownerless_count;

  IF ownerless_count > 0 THEN
    RAISE EXCEPTION
      'Organization foundation failed: % records still have no organization ownership.',
      ownerless_count;
  END IF;

  SELECT COUNT(*) INTO site_customer_mismatch_count
  FROM "Site" s
  JOIN "Customer" c ON c."id" = s."customerId"
  WHERE s."organizationId" <> c."organizationId";

  IF site_customer_mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Organization foundation failed: % sites do not match customer organization ownership.',
      site_customer_mismatch_count;
  END IF;

  SELECT COUNT(*) INTO estimate_lead_mismatch_count
  FROM "Estimate" e
  JOIN "Lead" l ON l."id" = e."leadId"
  WHERE e."organizationId" <> l."organizationId";

  IF estimate_lead_mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Organization foundation failed: % estimates do not match lead organization ownership.',
      estimate_lead_mismatch_count;
  END IF;

  SELECT COUNT(*) INTO estimate_walkthrough_mismatch_count
  FROM "Estimate" e
  JOIN "Walkthrough" w ON w."id" = e."walkthroughId"
  WHERE e."walkthroughId" IS NOT NULL
    AND e."organizationId" <> w."organizationId";

  IF estimate_walkthrough_mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Organization foundation failed: % estimates do not match walkthrough organization ownership.',
      estimate_walkthrough_mismatch_count;
  END IF;

  SELECT COUNT(*) INTO work_order_estimate_mismatch_count
  FROM "WorkOrder" w
  JOIN "Estimate" e ON e."id" = w."estimateId"
  WHERE w."organizationId" <> e."organizationId";

  IF work_order_estimate_mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Organization foundation failed: % work orders do not match estimate organization ownership.',
      work_order_estimate_mismatch_count;
  END IF;

  SELECT COUNT(*) INTO work_order_customer_mismatch_count
  FROM "WorkOrder" w
  JOIN "Customer" c ON c."id" = w."customerId"
  WHERE w."organizationId" <> c."organizationId";

  IF work_order_customer_mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Organization foundation failed: % work orders do not match customer organization ownership.',
      work_order_customer_mismatch_count;
  END IF;

  SELECT COUNT(*) INTO work_order_site_mismatch_count
  FROM "WorkOrder" w
  JOIN "Site" s ON s."id" = w."siteId"
  WHERE w."organizationId" <> s."organizationId";

  IF work_order_site_mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Organization foundation failed: % work orders do not match site organization ownership.',
      work_order_site_mismatch_count;
  END IF;
END;
$$;

-- 6) Enforce non-null organization ownership.
ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Contact" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Site" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Walkthrough" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Estimate" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "WorkOrder" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ScheduleEvent" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Contract" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Asset" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Attachment" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Checklist" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ChecklistItem" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Note" ALTER COLUMN "organizationId" SET NOT NULL;

-- 7) Add organization ownership foreign keys.
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Walkthrough" ADD CONSTRAINT "Walkthrough_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8) Add organization-scoped indexes for query safety.
CREATE INDEX "User_organizationId_role_idx" ON "User"("organizationId", "role");
CREATE INDEX "Lead_organizationId_status_createdAt_idx" ON "Lead"("organizationId", "status", "createdAt");
CREATE INDEX "Customer_organizationId_isActive_createdAt_idx" ON "Customer"("organizationId", "isActive", "createdAt");
CREATE INDEX "Contact_organizationId_customerId_isPrimary_idx" ON "Contact"("organizationId", "customerId", "isPrimary");
CREATE INDEX "Site_organizationId_customerId_isActive_idx" ON "Site"("organizationId", "customerId", "isActive");
CREATE INDEX "Walkthrough_organizationId_status_scheduledStart_idx" ON "Walkthrough"("organizationId", "status", "scheduledStart");
CREATE INDEX "Estimate_organizationId_status_createdAt_idx" ON "Estimate"("organizationId", "status", "createdAt");
CREATE INDEX "WorkOrder_organizationId_status_scheduledStart_idx" ON "WorkOrder"("organizationId", "status", "scheduledStart");
CREATE INDEX "ScheduleEvent_organizationId_status_startsAt_idx" ON "ScheduleEvent"("organizationId", "status", "startsAt");
CREATE INDEX "Contract_organizationId_status_createdAt_idx" ON "Contract"("organizationId", "status", "createdAt");
CREATE INDEX "Asset_organizationId_siteId_createdAt_idx" ON "Asset"("organizationId", "siteId", "createdAt");
CREATE INDEX "Invoice_organizationId_customerId_issuedAt_idx" ON "Invoice"("organizationId", "customerId", "issuedAt");
CREATE INDEX "Task_organizationId_workOrderId_sortOrder_idx" ON "Task"("organizationId", "workOrderId", "sortOrder");
CREATE INDEX "Attachment_organizationId_entityType_entityId_idx" ON "Attachment"("organizationId", "entityType", "entityId");
CREATE INDEX "Checklist_organizationId_createdAt_idx" ON "Checklist"("organizationId", "createdAt");
CREATE INDEX "ChecklistItem_organizationId_checklistId_sortOrder_idx" ON "ChecklistItem"("organizationId", "checklistId", "sortOrder");
CREATE INDEX "Note_organizationId_entityType_entityId_createdAt_idx" ON "Note"("organizationId", "entityType", "entityId", "createdAt");

-- 9) Enforce key organization-consistency rules in hardened lineage paths.
CREATE OR REPLACE FUNCTION enforce_site_customer_organization_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  customer_org_id TEXT;
BEGIN
  SELECT c."organizationId"
    INTO customer_org_id
  FROM "Customer" AS c
  WHERE c."id" = NEW."customerId";

  IF customer_org_id IS NULL THEN
    RAISE EXCEPTION 'Site customerId must reference an existing customer.';
  END IF;

  IF customer_org_id <> NEW."organizationId" THEN
    RAISE EXCEPTION 'Site organizationId must match customer organizationId.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "Site_customer_org_consistency_trigger" ON "Site";
CREATE TRIGGER "Site_customer_org_consistency_trigger"
BEFORE INSERT OR UPDATE OF "organizationId", "customerId" ON "Site"
FOR EACH ROW
EXECUTE FUNCTION enforce_site_customer_organization_consistency();

CREATE OR REPLACE FUNCTION enforce_estimate_origin_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  lead_org_id TEXT;
  walkthrough_lead_id TEXT;
  walkthrough_org_id TEXT;
BEGIN
  SELECT l."organizationId"
    INTO lead_org_id
  FROM "Lead" AS l
  WHERE l."id" = NEW."leadId";

  IF lead_org_id IS NULL THEN
    RAISE EXCEPTION 'Estimate leadId must reference an existing lead.';
  END IF;

  IF lead_org_id <> NEW."organizationId" THEN
    RAISE EXCEPTION 'Estimate organizationId must match lead organizationId.';
  END IF;

  IF NEW."walkthroughId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT w."leadId", w."organizationId"
    INTO walkthrough_lead_id, walkthrough_org_id
  FROM "Walkthrough" AS w
  WHERE w."id" = NEW."walkthroughId";

  IF walkthrough_lead_id IS NULL THEN
    RAISE EXCEPTION
      'Estimate walkthroughId must reference a walkthrough linked to a lead.';
  END IF;

  IF walkthrough_org_id <> NEW."organizationId" THEN
    RAISE EXCEPTION
      'Estimate organizationId must match walkthrough organizationId.';
  END IF;

  IF NEW."leadId" <> walkthrough_lead_id THEN
    RAISE EXCEPTION
      'Estimate leadId must match walkthrough leadId.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_work_order_estimate_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  estimate_status "EstimateStatus";
  estimate_org_id TEXT;
  customer_org_id TEXT;
  site_org_id TEXT;
BEGIN
  SELECT e."status", e."organizationId"
    INTO estimate_status, estimate_org_id
  FROM "Estimate" AS e
  WHERE e."id" = NEW."estimateId";

  IF estimate_status IS NULL THEN
    RAISE EXCEPTION
      'Work order estimateId must reference an existing estimate.';
  END IF;

  IF estimate_status <> 'approved'::"EstimateStatus" THEN
    RAISE EXCEPTION
      'Work orders must be created from approved estimates only.';
  END IF;

  IF estimate_org_id <> NEW."organizationId" THEN
    RAISE EXCEPTION
      'Work order organizationId must match estimate organizationId.';
  END IF;

  SELECT c."organizationId"
    INTO customer_org_id
  FROM "Customer" AS c
  WHERE c."id" = NEW."customerId";

  IF customer_org_id IS NULL THEN
    RAISE EXCEPTION 'Work order customerId must reference an existing customer.';
  END IF;

  IF customer_org_id <> NEW."organizationId" THEN
    RAISE EXCEPTION
      'Work order organizationId must match customer organizationId.';
  END IF;

  SELECT s."organizationId"
    INTO site_org_id
  FROM "Site" AS s
  WHERE s."id" = NEW."siteId";

  IF site_org_id IS NULL THEN
    RAISE EXCEPTION 'Work order siteId must reference an existing site.';
  END IF;

  IF site_org_id <> NEW."organizationId" THEN
    RAISE EXCEPTION
      'Work order organizationId must match site organizationId.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_lead_conversion_traceability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  work_order_customer_id TEXT;
  work_order_org_id TEXT;
  estimate_lead_id TEXT;
  lead_customer_org_id TEXT;
BEGIN
  IF NEW."customerId" IS NOT NULL THEN
    SELECT c."organizationId"
      INTO lead_customer_org_id
    FROM "Customer" AS c
    WHERE c."id" = NEW."customerId";

    IF lead_customer_org_id IS NULL THEN
      RAISE EXCEPTION
        'Lead customerId must reference an existing customer.';
    END IF;

    IF lead_customer_org_id <> NEW."organizationId" THEN
      RAISE EXCEPTION
        'Lead organizationId must match customer organizationId.';
    END IF;
  END IF;

  IF NEW."convertedWorkOrderId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT w."customerId", w."organizationId", e."leadId"
    INTO work_order_customer_id, work_order_org_id, estimate_lead_id
  FROM "WorkOrder" AS w
  JOIN "Estimate" AS e
    ON e."id" = w."estimateId"
  WHERE w."id" = NEW."convertedWorkOrderId";

  IF work_order_customer_id IS NULL OR estimate_lead_id IS NULL THEN
    RAISE EXCEPTION
      'Lead convertedWorkOrderId must reference a work order with valid estimate lineage.';
  END IF;

  IF work_order_org_id <> NEW."organizationId" THEN
    RAISE EXCEPTION
      'Lead organizationId must match converted work order organizationId.';
  END IF;

  IF estimate_lead_id <> NEW."id" THEN
    RAISE EXCEPTION
      'Lead convertedWorkOrderId must reference a work order created from this lead''s estimate lineage.';
  END IF;

  IF NEW."customerId" IS NOT NULL AND NEW."customerId" <> work_order_customer_id THEN
    RAISE EXCEPTION
      'Lead customerId must match converted work order customerId.';
  END IF;

  RETURN NEW;
END;
$$;
