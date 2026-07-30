-- CreateEnum
CREATE TYPE "ChatChannel" AS ENUM ('GLOBAL', 'DIRECT');

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "channel" "ChatChannel" NOT NULL DEFAULT 'GLOBAL',
    "senderEmpireId" TEXT,
    "senderName" TEXT NOT NULL,
    "recipientEmpireId" TEXT,
    "body" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3),
    "hiddenById" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_channel_createdAt_idx" ON "ChatMessage"("channel", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_recipientEmpireId_createdAt_idx" ON "ChatMessage"("recipientEmpireId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_senderEmpireId_createdAt_idx" ON "ChatMessage"("senderEmpireId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderEmpireId_fkey" FOREIGN KEY ("senderEmpireId") REFERENCES "Empire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_recipientEmpireId_fkey" FOREIGN KEY ("recipientEmpireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
