-- Restored migration to match already-applied database state

ALTER TABLE "WorkOrder"
ALTER COLUMN "estimateId" DROP NOT NULL;
