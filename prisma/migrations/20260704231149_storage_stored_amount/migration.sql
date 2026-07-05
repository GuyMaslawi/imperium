-- AlterTable
-- Guarded: this migration predates 20260705120000, which now creates
-- "ResourceStorage" (including "storedAmount"). On a fresh replay the table
-- does not exist yet, so this becomes a no-op; on databases that migrated
-- through the original history the column is added here.
ALTER TABLE IF EXISTS "ResourceStorage" ADD COLUMN IF NOT EXISTS "storedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
