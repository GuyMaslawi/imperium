-- CreateEnum
CREATE TYPE "ResourceStorageType" AS ENUM ('GOLD', 'WOOD', 'IRON', 'STONE');

-- CreateEnum
CREATE TYPE "EmpireUpgradeType" AS ENUM ('CITIZEN_GROWTH', 'INTELLIGENCE', 'BANK_DEPOSIT_LIMIT', 'BANK_DAILY_INTEREST');

-- CreateTable
CREATE TABLE "GameSeason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceStorage" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "resourceType" "ResourceStorageType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    -- Included here so fresh replays get the column even though the (older,
    -- guarded) 20260704231149_storage_stored_amount migration is a no-op.
    "storedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceStorage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpireUpgrade" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "type" "EmpireUpgradeType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpireUpgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "goldBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceStorage_empireId_resourceType_key" ON "ResourceStorage"("empireId", "resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "EmpireUpgrade_empireId_type_key" ON "EmpireUpgrade"("empireId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_empireId_key" ON "BankAccount"("empireId");

-- Rename tanks -> mineSlaves, keeping existing counts (dev mapping)
ALTER TABLE "Army" RENAME COLUMN "tanks" TO "mineSlaves";

-- Tanks are gone from battle reports
ALTER TABLE "BattleReport" DROP COLUMN "attackerTanksLost",
DROP COLUMN "defenderTanksLost";

-- Generic workers become mine slaves assigned per production building
ALTER TABLE "Building" RENAME COLUMN "workersAssigned" TO "slavesAssigned";

-- Empire: new update timestamps + season link, drop generic workers
ALTER TABLE "Empire" RENAME COLUMN "lastResourceUpdateAt" TO "lastRegularUpdateAt";
ALTER TABLE "Empire" DROP COLUMN "workers",
ADD COLUMN "lastDailyUpdateAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "seasonId" TEXT;

-- Spy reports: tanks -> mine slaves, plus revealed spies
ALTER TABLE "SpyReport" RENAME COLUMN "revealedTanks" TO "revealedMineSlaves";
ALTER TABLE "SpyReport" ADD COLUMN "revealedSpies" INTEGER;

-- Backfill: one storage per resource for every empire, carrying over the old
-- STORAGE building level so existing capacity is preserved.
INSERT INTO "ResourceStorage" ("id", "empireId", "resourceType", "level", "updatedAt")
SELECT
    gen_random_uuid()::text,
    e."id",
    rt."resourceType",
    COALESCE((SELECT b."level" FROM "Building" b WHERE b."empireId" = e."id" AND b."type" = 'STORAGE'), 1),
    CURRENT_TIMESTAMP
FROM "Empire" e
CROSS JOIN (
    SELECT unnest(enum_range(NULL::"ResourceStorageType")) AS "resourceType"
) rt;

-- Backfill: all four upgrades at level 1 for every empire
INSERT INTO "EmpireUpgrade" ("id", "empireId", "type", "level", "updatedAt")
SELECT gen_random_uuid()::text, e."id", ut."type", 1, CURRENT_TIMESTAMP
FROM "Empire" e
CROSS JOIN (
    SELECT unnest(enum_range(NULL::"EmpireUpgradeType")) AS "type"
) ut;

-- Backfill: empty bank account for every empire
INSERT INTO "BankAccount" ("id", "empireId", "goldBalance", "updatedAt")
SELECT gen_random_uuid()::text, e."id", 0, CURRENT_TIMESTAMP
FROM "Empire" e;

-- Remove the old STORAGE building rows, then drop the enum value
DELETE FROM "Building" WHERE "type" = 'STORAGE';

-- AlterEnum
BEGIN;
CREATE TYPE "BuildingType_new" AS ENUM ('GOLD_MINE', 'WOOD_CAMP', 'IRON_MINE', 'STONE_QUARRY', 'BARRACKS', 'SPY_CENTER');
ALTER TABLE "Building" ALTER COLUMN "type" TYPE "BuildingType_new" USING ("type"::text::"BuildingType_new");
ALTER TYPE "BuildingType" RENAME TO "BuildingType_old";
ALTER TYPE "BuildingType_new" RENAME TO "BuildingType";
DROP TYPE "BuildingType_old";
COMMIT;

-- AddForeignKey
ALTER TABLE "Empire" ADD CONSTRAINT "Empire_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "GameSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceStorage" ADD CONSTRAINT "ResourceStorage_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpireUpgrade" ADD CONSTRAINT "EmpireUpgrade_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
