-- Messages system: a per-empire inbox for system announcements and combat
-- alerts ("you were attacked", "a spy was caught in your territory"), plus
-- a reports-seen timestamp that drives the sidebar "new reports" badge.

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('SYSTEM', 'BATTLE', 'SPY');

-- AlterTable
ALTER TABLE "Empire" ADD COLUMN "reportsSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_empireId_readAt_idx" ON "Message"("empireId", "readAt");

-- CreateIndex
CREATE INDEX "Message_empireId_createdAt_idx" ON "Message"("empireId", "createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
