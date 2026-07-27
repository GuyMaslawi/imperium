-- AlterTable: hero health + death timestamp.
-- Existing heroes start at full health and alive.
ALTER TABLE "Hero" ADD COLUMN     "health" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "diedAt" TIMESTAMP(3);
