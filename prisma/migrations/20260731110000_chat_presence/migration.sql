-- AlterTable
ALTER TABLE "Empire" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Empire_lastSeenAt_idx" ON "Empire"("lastSeenAt");
