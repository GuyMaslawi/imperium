-- Weapons system: purchasable attack/defense/spy weapons per empire, with
-- per-category tier unlocks. Weapon definitions live in code; the DB stores
-- only owned quantities and the unlocked tier per category.

-- CreateEnum
CREATE TYPE "WeaponCategory" AS ENUM ('ATTACK', 'DEFENSE', 'SPY');

-- AlterTable: battle reports break the final powers down into soldiers vs
-- weapons (nullable — reports predating weapons have no breakdown).
ALTER TABLE "BattleReport" ADD COLUMN     "attackerSoldiersPower" DOUBLE PRECISION,
ADD COLUMN     "attackerWeaponsPower" DOUBLE PRECISION,
ADD COLUMN     "defenderSoldiersPower" DOUBLE PRECISION,
ADD COLUMN     "defenderWeaponsPower" DOUBLE PRECISION;

-- AlterTable: spy reports record the final success chance and the bonus
-- (in percentage points) contributed by spy weapons.
ALTER TABLE "SpyReport" ADD COLUMN     "finalChance" DOUBLE PRECISION,
ADD COLUMN     "weaponsBonus" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "EmpireWeapon" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "weaponKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpireWeapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpireWeaponUnlock" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "category" "WeaponCategory" NOT NULL,
    "unlockedTier" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpireWeaponUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmpireWeapon_empireId_weaponKey_key" ON "EmpireWeapon"("empireId", "weaponKey");

-- CreateIndex
CREATE UNIQUE INDEX "EmpireWeaponUnlock_empireId_category_key" ON "EmpireWeaponUnlock"("empireId", "category");

-- AddForeignKey
ALTER TABLE "EmpireWeapon" ADD CONSTRAINT "EmpireWeapon_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpireWeaponUnlock" ADD CONSTRAINT "EmpireWeaponUnlock_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing empire starts with the first two weapon tiers
-- unlocked in every category.
INSERT INTO "EmpireWeaponUnlock" ("id", "empireId", "category", "unlockedTier", "updatedAt")
SELECT gen_random_uuid()::text, e."id", wc."category", 2, CURRENT_TIMESTAMP
FROM "Empire" e
CROSS JOIN (
    SELECT unnest(enum_range(NULL::"WeaponCategory")) AS "category"
) wc
ON CONFLICT ("empireId", "category") DO NOTHING;
