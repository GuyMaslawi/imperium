-- AlterEnum
ALTER TYPE "PurchaseStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "DiamondPurchase" ADD COLUMN     "captureRef" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "DiamondPurchase_captureRef_key" ON "DiamondPurchase"("captureRef");
