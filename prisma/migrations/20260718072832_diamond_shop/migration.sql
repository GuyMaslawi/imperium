-- CreateEnum
CREATE TYPE "DiamondEffectKind" AS ENUM ('RESOURCE_BOOST_GOLD', 'RESOURCE_BOOST_WOOD', 'RESOURCE_BOOST_IRON', 'RESOURCE_BOOST_STONE', 'SHOP_DISCOUNT', 'BANK_INTEREST');

-- AlterTable
ALTER TABLE "Hero" ADD COLUMN     "pointsResetSeasonId" TEXT;

-- CreateTable
CREATE TABLE "DiamondEffect" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "kind" "DiamondEffectKind" NOT NULL,
    "magnitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeUntil" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiamondEffect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiamondEffect_empireId_activeUntil_idx" ON "DiamondEffect"("empireId", "activeUntil");

-- CreateIndex
CREATE UNIQUE INDEX "DiamondEffect_empireId_kind_key" ON "DiamondEffect"("empireId", "kind");

-- AddForeignKey
ALTER TABLE "DiamondEffect" ADD CONSTRAINT "DiamondEffect_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
