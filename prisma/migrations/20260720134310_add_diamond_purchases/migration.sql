-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "DiamondPurchase" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "diamonds" INTEGER NOT NULL,
    "priceIls" DOUBLE PRECISION NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiamondPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiamondPurchase_empireId_idx" ON "DiamondPurchase"("empireId");

-- CreateIndex
CREATE INDEX "DiamondPurchase_status_idx" ON "DiamondPurchase"("status");

-- AddForeignKey
ALTER TABLE "DiamondPurchase" ADD CONSTRAINT "DiamondPurchase_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
