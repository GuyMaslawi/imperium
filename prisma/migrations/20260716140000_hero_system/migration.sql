-- Hero system: a per-empire war hero that levels up from battles, allocates
-- stat points (1 point = +1% attack / defense / resources), equips captured
-- items, and can be reset ("prestige") at level 100.

-- CreateEnum
CREATE TYPE "HeroRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "HeroItemSlot" AS ENUM ('SWORD', 'GAUNTLETS', 'WINGS', 'HELMET', 'ARMOR', 'SHIELD', 'PANTS', 'BOOTS', 'RELIC');

-- CreateTable
CREATE TABLE "Hero" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "unspentPoints" INTEGER NOT NULL DEFAULT 0,
    "attackPoints" INTEGER NOT NULL DEFAULT 0,
    "defensePoints" INTEGER NOT NULL DEFAULT 0,
    "resourcePoints" INTEGER NOT NULL DEFAULT 0,
    "resets" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroItem" (
    "id" TEXT NOT NULL,
    "heroId" TEXT NOT NULL,
    "slot" "HeroItemSlot" NOT NULL,
    "level" INTEGER NOT NULL,
    "rarity" "HeroRarity" NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hero_empireId_key" ON "Hero"("empireId");

-- CreateIndex
CREATE INDEX "HeroItem_heroId_idx" ON "HeroItem"("heroId");

-- At most one equipped item per slot per hero (partial unique index).
CREATE UNIQUE INDEX "HeroItem_heroId_slot_equipped_key" ON "HeroItem"("heroId", "slot") WHERE "equipped";

-- AddForeignKey
ALTER TABLE "Hero" ADD CONSTRAINT "Hero_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroItem" ADD CONSTRAINT "HeroItem_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: battle reports record hero XP, hero power bonuses and item drops
ALTER TABLE "BattleReport" ADD COLUMN "attackerHeroBonusPct" DOUBLE PRECISION,
ADD COLUMN "defenderHeroBonusPct" DOUBLE PRECISION,
ADD COLUMN "attackerHeroXp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "defenderHeroXp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "droppedItemSlot" "HeroItemSlot",
ADD COLUMN "droppedItemLevel" INTEGER,
ADD COLUMN "droppedItemRarity" "HeroRarity";

-- Backfill: a fresh level-1 hero for every existing empire
INSERT INTO "Hero" ("id", "empireId", "updatedAt")
SELECT gen_random_uuid()::text, e."id", CURRENT_TIMESTAMP
FROM "Empire" e
ON CONFLICT ("empireId") DO NOTHING;
