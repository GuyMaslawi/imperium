-- CreateEnum
CREATE TYPE "BossMove" AS ENUM ('SMASH', 'SWEEP', 'EXPOSED');

-- CreateEnum
CREATE TYPE "BossTactic" AS ENUM ('ASSAULT', 'SHIELD', 'FLANK', 'FURY');

-- CreateEnum
CREATE TYPE "BossBattleStatus" AS ENUM ('ACTIVE', 'KILLED', 'ROUTED', 'SPENT', 'RETREATED', 'EXPIRED');

-- AlterTable
ALTER TABLE "BossFight" ADD COLUMN     "battleId" TEXT,
ADD COLUMN     "bossHpAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "bossMaxHp" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "damageDealt" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "endedBy" "BossBattleStatus",
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "rounds" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BossSiege" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "cityTier" INTEGER NOT NULL,
    "bossKey" TEXT NOT NULL,
    "cycleAt" TIMESTAMP(3) NOT NULL,
    "maxHp" DOUBLE PRECISION NOT NULL,
    "hp" DOUBLE PRECISION NOT NULL,
    "damageDealt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sorties" INTEGER NOT NULL DEFAULT 0,
    "killedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BossSiege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BossBattle" (
    "id" TEXT NOT NULL,
    "siegeId" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "status" "BossBattleStatus" NOT NULL DEFAULT 'ACTIVE',
    "round" INTEGER NOT NULL DEFAULT 0,
    "maxRounds" INTEGER NOT NULL,
    "nextMove" "BossMove" NOT NULL,
    "fury" INTEGER NOT NULL DEFAULT 0,
    "attackPower" DOUBLE PRECISION NOT NULL,
    "heroBonusPct" DOUBLE PRECISION,
    "guildBonusPct" DOUBLE PRECISION,
    "soldiersAtStart" INTEGER NOT NULL,
    "soldiersLost" INTEGER NOT NULL DEFAULT 0,
    "damageDealt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hpAtStart" DOUBLE PRECISION NOT NULL,
    "correctCounters" INTEGER NOT NULL DEFAULT 0,
    "decisions" INTEGER NOT NULL DEFAULT 0,
    "turnsSpent" INTEGER NOT NULL,
    "log" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "BossBattle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BossSiege_empireId_cityTier_cycleAt_key" ON "BossSiege"("empireId", "cityTier", "cycleAt");

-- CreateIndex
CREATE INDEX "BossBattle_empireId_status_idx" ON "BossBattle"("empireId", "status");

-- CreateIndex
CREATE INDEX "BossBattle_siegeId_idx" ON "BossBattle"("siegeId");

-- CreateIndex
CREATE UNIQUE INDEX "BossFight_battleId_key" ON "BossFight"("battleId");

-- AddForeignKey
ALTER TABLE "BossSiege" ADD CONSTRAINT "BossSiege_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BossBattle" ADD CONSTRAINT "BossBattle_siegeId_fkey" FOREIGN KEY ("siegeId") REFERENCES "BossSiege"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BossBattle" ADD CONSTRAINT "BossBattle_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BossFight" ADD CONSTRAINT "BossFight_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "BossBattle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

