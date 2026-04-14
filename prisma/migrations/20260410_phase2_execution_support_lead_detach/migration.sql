-- Phase 2 correction: detach execution models from Lead.
-- This preserves the governance rule that Task/Checklist support execution
-- under WorkOrder/Walkthrough and do not attach directly to Lead.
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_leadId_fkey";
ALTER TABLE "Checklist" DROP CONSTRAINT IF EXISTS "Checklist_leadId_fkey";

ALTER TABLE "Task" DROP COLUMN IF EXISTS "leadId";
ALTER TABLE "Checklist" DROP COLUMN IF EXISTS "leadId";
