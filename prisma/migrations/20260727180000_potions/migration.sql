-- CreateEnum
CREATE TYPE "PotionKind" AS ENUM ('DOUBLE_XP', 'DOUBLE_RESOURCES', 'HERO_INVULNERABLE', 'FORGE_DISCOUNT');

-- AlterTable
ALTER TABLE "BattleReport" ADD COLUMN     "droppedPotionKind" "PotionKind";

-- CreateTable
CREATE TABLE "PotionStack" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "kind" "PotionKind" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PotionStack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PotionEffect" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "kind" "PotionKind" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PotionEffect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PotionStack_empireId_kind_key" ON "PotionStack"("empireId", "kind");

-- CreateIndex
CREATE INDEX "PotionEffect_empireId_expiresAt_idx" ON "PotionEffect"("empireId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PotionEffect_empireId_kind_key" ON "PotionEffect"("empireId", "kind");

-- AddForeignKey
ALTER TABLE "PotionStack" ADD CONSTRAINT "PotionStack_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PotionEffect" ADD CONSTRAINT "PotionEffect_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
