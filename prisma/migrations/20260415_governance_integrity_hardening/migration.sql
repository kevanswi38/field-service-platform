-- Governance stop-the-line structural hardening:
-- Lead -> Estimate -> Conversion -> WorkOrder integrity constraints

-- 1) Backfill estimate lead ownership from lead-derived walkthroughs.
UPDATE "Estimate" AS e
SET "leadId" = w."leadId"
FROM "Walkthrough" AS w
WHERE e."walkthroughId" = w."id"
  AND e."leadId" IS NULL
  AND w."leadId" IS NOT NULL;

-- 2) Ensure conversion linkage column exists for lead traceability.
ALTER TABLE "Lead"
ADD COLUMN IF NOT EXISTS "convertedWorkOrderId" TEXT;

-- 3) Backfill lead conversion linkage when lineage is unambiguous.
WITH lineage AS (
  SELECT
    l."id" AS lead_id,
    w."id" AS work_order_id,
    COUNT(*) OVER (PARTITION BY l."id") AS work_order_count,
    ROW_NUMBER() OVER (
      PARTITION BY l."id"
      ORDER BY w."createdAt" DESC, w."id" DESC
    ) AS work_order_rank
  FROM "Lead" AS l
  JOIN "Estimate" AS e
    ON e."leadId" = l."id"
  JOIN "WorkOrder" AS w
    ON w."estimateId" = e."id"
  WHERE l."status" = 'won'::"LeadStatus"
     OR l."convertedAt" IS NOT NULL
)
UPDATE "Lead" AS l
SET "convertedWorkOrderId" = lineage.work_order_id
FROM lineage
WHERE l."id" = lineage.lead_id
  AND l."convertedWorkOrderId" IS NULL
  AND lineage.work_order_count = 1
  AND lineage.work_order_rank = 1;

-- 4) Backfill conversion markers from converted work order linkage.
UPDATE "Lead" AS l
SET "customerId" = w."customerId"
FROM "WorkOrder" AS w
WHERE l."convertedWorkOrderId" = w."id"
  AND l."customerId" IS NULL;

UPDATE "Lead" AS l
SET "convertedAt" = w."createdAt"
FROM "WorkOrder" AS w
WHERE l."convertedWorkOrderId" = w."id"
  AND l."convertedAt" IS NULL;

UPDATE "Lead"
SET "wonAt" = "convertedAt"
WHERE "status" = 'won'::"LeadStatus"
  AND "wonAt" IS NULL
  AND "convertedAt" IS NOT NULL;

-- 5) Fail fast if invalid structural states remain.
DO $$
DECLARE
  orphan_estimate_count INTEGER;
  work_order_without_estimate_count INTEGER;
  ambiguous_conversion_count INTEGER;
  won_without_trace_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_estimate_count
  FROM "Estimate"
  WHERE "leadId" IS NULL;

  IF orphan_estimate_count > 0 THEN
    RAISE EXCEPTION
      'Structural hardening failed: % estimates still have no lead ownership.',
      orphan_estimate_count;
  END IF;

  SELECT COUNT(*) INTO work_order_without_estimate_count
  FROM "WorkOrder"
  WHERE "estimateId" IS NULL;

  IF work_order_without_estimate_count > 0 THEN
    RAISE EXCEPTION
      'Structural hardening failed: % work orders are missing estimate lineage.',
      work_order_without_estimate_count;
  END IF;

  SELECT COUNT(*) INTO ambiguous_conversion_count
  FROM (
    SELECT l."id"
    FROM "Lead" AS l
    JOIN "Estimate" AS e
      ON e."leadId" = l."id"
    JOIN "WorkOrder" AS w
      ON w."estimateId" = e."id"
    WHERE (l."status" = 'won'::"LeadStatus" OR l."convertedAt" IS NOT NULL)
      AND l."convertedWorkOrderId" IS NULL
    GROUP BY l."id"
    HAVING COUNT(*) > 1
  ) AS ambiguous_leads;

  IF ambiguous_conversion_count > 0 THEN
    RAISE EXCEPTION
      'Structural hardening failed: % leads have multiple candidate conversion work orders and require manual resolution.',
      ambiguous_conversion_count;
  END IF;

  SELECT COUNT(*) INTO won_without_trace_count
  FROM "Lead"
  WHERE "status" = 'won'::"LeadStatus"
    AND (
      "convertedAt" IS NULL
      OR "customerId" IS NULL
      OR "convertedWorkOrderId" IS NULL
    );

  IF won_without_trace_count > 0 THEN
    RAISE EXCEPTION
      'Structural hardening failed: % won leads are missing conversion traceability fields.',
      won_without_trace_count;
  END IF;
END;
$$;

-- 6) Remove ambiguous estimate ownership path through direct customer linkage.
ALTER TABLE "Estimate" DROP CONSTRAINT IF EXISTS "Estimate_customerId_fkey";
DROP INDEX IF EXISTS "Estimate_customerId_idx";
ALTER TABLE "Estimate" DROP COLUMN IF EXISTS "customerId";

-- 7) Harden foreign keys and required lineage columns.
ALTER TABLE "Estimate" DROP CONSTRAINT IF EXISTS "Estimate_origin_required_chk";
ALTER TABLE "Estimate" DROP CONSTRAINT IF EXISTS "Estimate_leadId_fkey";
ALTER TABLE "Estimate"
ALTER COLUMN "leadId" SET NOT NULL;
ALTER TABLE "Estimate"
ADD CONSTRAINT "Estimate_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkOrder" DROP CONSTRAINT IF EXISTS "WorkOrder_estimateId_fkey";
ALTER TABLE "WorkOrder"
ALTER COLUMN "estimateId" SET NOT NULL;
ALTER TABLE "WorkOrder"
ADD CONSTRAINT "WorkOrder_estimateId_fkey"
FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "WorkOrder_estimateId_key"
ON "WorkOrder"("estimateId");

CREATE UNIQUE INDEX IF NOT EXISTS "Lead_convertedWorkOrderId_key"
ON "Lead"("convertedWorkOrderId");

ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_convertedWorkOrderId_fkey";
ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_convertedWorkOrderId_fkey"
FOREIGN KEY ("convertedWorkOrderId") REFERENCES "WorkOrder"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_won_requires_conversion_chk";
ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_won_requires_conversion_chk"
CHECK (
  "status" <> 'won'::"LeadStatus"
  OR (
    "convertedAt" IS NOT NULL
    AND "customerId" IS NOT NULL
    AND "convertedWorkOrderId" IS NOT NULL
  )
);

-- 8) Enforce subordinate walkthrough linkage for estimates.
CREATE OR REPLACE FUNCTION enforce_estimate_origin_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  walkthrough_lead_id TEXT;
BEGIN
  IF NEW."walkthroughId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT w."leadId"
    INTO walkthrough_lead_id
  FROM "Walkthrough" AS w
  WHERE w."id" = NEW."walkthroughId";

  IF walkthrough_lead_id IS NULL THEN
    RAISE EXCEPTION
      'Estimate walkthroughId must reference a walkthrough linked to a lead.';
  END IF;

  IF NEW."leadId" <> walkthrough_lead_id THEN
    RAISE EXCEPTION
      'Estimate leadId must match walkthrough leadId.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "Estimate_origin_consistency_trigger" ON "Estimate";
CREATE TRIGGER "Estimate_origin_consistency_trigger"
BEFORE INSERT OR UPDATE OF "leadId", "walkthroughId" ON "Estimate"
FOR EACH ROW
EXECUTE FUNCTION enforce_estimate_origin_consistency();

-- 9) Enforce approved-estimate lineage before creating work orders.
CREATE OR REPLACE FUNCTION enforce_work_order_estimate_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  estimate_status "EstimateStatus";
BEGIN
  SELECT e."status"
    INTO estimate_status
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "WorkOrder_estimate_approval_trigger" ON "WorkOrder";
CREATE TRIGGER "WorkOrder_estimate_approval_trigger"
BEFORE INSERT OR UPDATE OF "estimateId" ON "WorkOrder"
FOR EACH ROW
EXECUTE FUNCTION enforce_work_order_estimate_approval();

-- 10) Enforce lead conversion traceability through estimate lineage.
CREATE OR REPLACE FUNCTION enforce_lead_conversion_traceability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  work_order_customer_id TEXT;
  estimate_lead_id TEXT;
BEGIN
  IF NEW."convertedWorkOrderId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT w."customerId", e."leadId"
    INTO work_order_customer_id, estimate_lead_id
  FROM "WorkOrder" AS w
  JOIN "Estimate" AS e
    ON e."id" = w."estimateId"
  WHERE w."id" = NEW."convertedWorkOrderId";

  IF work_order_customer_id IS NULL OR estimate_lead_id IS NULL THEN
    RAISE EXCEPTION
      'Lead convertedWorkOrderId must reference a work order with valid estimate lineage.';
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

DROP TRIGGER IF EXISTS "Lead_conversion_traceability_trigger" ON "Lead";
CREATE TRIGGER "Lead_conversion_traceability_trigger"
BEFORE INSERT OR UPDATE OF "status", "customerId", "convertedAt", "convertedWorkOrderId" ON "Lead"
FOR EACH ROW
EXECUTE FUNCTION enforce_lead_conversion_traceability();
