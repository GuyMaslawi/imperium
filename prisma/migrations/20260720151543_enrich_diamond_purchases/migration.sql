-- DropForeignKey
ALTER TABLE "DiamondPurchase" DROP CONSTRAINT "DiamondPurchase_empireId_fkey";

-- AlterTable
ALTER TABLE "DiamondPurchase" ADD COLUMN     "baseDiamonds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "basePriceIls" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "bonusDiamonds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'ILS',
ADD COLUMN     "empireName" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "isTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "userEmail" TEXT,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "empireId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "DiamondPurchase_userId_idx" ON "DiamondPurchase"("userId");

-- CreateIndex
CREATE INDEX "DiamondPurchase_createdAt_idx" ON "DiamondPurchase"("createdAt");

-- AddForeignKey
ALTER TABLE "DiamondPurchase" ADD CONSTRAINT "DiamondPurchase_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
