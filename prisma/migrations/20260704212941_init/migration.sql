-- CreateEnum
CREATE TYPE "BuildingType" AS ENUM ('GOLD_MINE', 'WOOD_CAMP', 'IRON_MINE', 'STONE_QUARRY', 'STORAGE', 'BARRACKS', 'SPY_CENTER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empire" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "gold" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "wood" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "iron" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "stone" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "diamonds" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "citizens" INTEGER NOT NULL DEFAULT 50,
    "workers" INTEGER NOT NULL DEFAULT 20,
    "lastResourceUpdateAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "type" "BuildingType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "workersAssigned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Army" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "soldiers" INTEGER NOT NULL DEFAULT 0,
    "tanks" INTEGER NOT NULL DEFAULT 0,
    "spies" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Army_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpyReport" (
    "id" TEXT NOT NULL,
    "attackerEmpireId" TEXT NOT NULL,
    "defenderEmpireId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "revealedGold" DOUBLE PRECISION,
    "revealedWood" DOUBLE PRECISION,
    "revealedIron" DOUBLE PRECISION,
    "revealedStone" DOUBLE PRECISION,
    "revealedSoldiers" INTEGER,
    "revealedTanks" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleReport" (
    "id" TEXT NOT NULL,
    "attackerEmpireId" TEXT NOT NULL,
    "defenderEmpireId" TEXT NOT NULL,
    "attackerPower" DOUBLE PRECISION NOT NULL,
    "defenderPower" DOUBLE PRECISION NOT NULL,
    "winnerEmpireId" TEXT NOT NULL,
    "attackerSoldiersLost" INTEGER NOT NULL,
    "defenderSoldiersLost" INTEGER NOT NULL,
    "attackerTanksLost" INTEGER NOT NULL,
    "defenderTanksLost" INTEGER NOT NULL,
    "stolenGold" DOUBLE PRECISION NOT NULL,
    "stolenWood" DOUBLE PRECISION NOT NULL,
    "stolenIron" DOUBLE PRECISION NOT NULL,
    "stolenStone" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Empire_userId_key" ON "Empire"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Empire_name_key" ON "Empire"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Building_empireId_type_key" ON "Building"("empireId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Army_empireId_key" ON "Army"("empireId");

-- AddForeignKey
ALTER TABLE "Empire" ADD CONSTRAINT "Empire_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Army" ADD CONSTRAINT "Army_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpyReport" ADD CONSTRAINT "SpyReport_attackerEmpireId_fkey" FOREIGN KEY ("attackerEmpireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpyReport" ADD CONSTRAINT "SpyReport_defenderEmpireId_fkey" FOREIGN KEY ("defenderEmpireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleReport" ADD CONSTRAINT "BattleReport_attackerEmpireId_fkey" FOREIGN KEY ("attackerEmpireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleReport" ADD CONSTRAINT "BattleReport_defenderEmpireId_fkey" FOREIGN KEY ("defenderEmpireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
