-- Governance Recovery Phase 5:
-- minimal password-based authentication foundation.
ALTER TABLE "User"
ADD COLUMN "passwordHash" TEXT;
