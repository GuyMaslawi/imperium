-- AlterEnum
ALTER TYPE "MessageKind" ADD VALUE 'PLAYER';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "senderEmpireId" TEXT;

-- CreateIndex
CREATE INDEX "Message_senderEmpireId_createdAt_idx" ON "Message"("senderEmpireId", "createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderEmpireId_fkey" FOREIGN KEY ("senderEmpireId") REFERENCES "Empire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
