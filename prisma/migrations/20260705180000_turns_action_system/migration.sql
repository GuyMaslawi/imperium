-- Turns: a core resource spent on aggressive actions (spying / attacking),
-- gained on every regular (5-minute) update.

-- AlterEnum: recreate so the new value is usable for the backfill inserts
-- inside this same migration transaction.
CREATE TYPE "EmpireUpgradeType_new" AS ENUM ('CITIZEN_GROWTH', 'INTELLIGENCE', 'BANK_DEPOSIT_COUNT', 'BANK_DAILY_INTEREST', 'TURNS_PER_REGULAR_UPDATE');
ALTER TABLE "EmpireUpgrade" ALTER COLUMN "type" TYPE "EmpireUpgradeType_new" USING ("type"::text::"EmpireUpgradeType_new");
ALTER TYPE "EmpireUpgradeType" RENAME TO "EmpireUpgradeType_old";
ALTER TYPE "EmpireUpgradeType_new" RENAME TO "EmpireUpgradeType";
DROP TYPE "EmpireUpgradeType_old";

-- Empire: available turns (not storable, not stealable)
ALTER TABLE "Empire" ADD COLUMN "turns" INTEGER NOT NULL DEFAULT 0;

-- Action costs recorded on reports
ALTER TABLE "SpyReport" ADD COLUMN "turnsSpent" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "BattleReport" ADD COLUMN "turnsSpent" INTEGER NOT NULL DEFAULT 10;

-- Backfill: existing empires start with 50 turns (same as new players)
UPDATE "Empire" SET "turns" = 50;

-- Backfill: the turns-gain upgrade at level 1 for every existing empire
INSERT INTO "EmpireUpgrade" ("id", "empireId", "type", "level", "updatedAt")
SELECT gen_random_uuid()::text, e."id", 'TURNS_PER_REGULAR_UPDATE', 1, CURRENT_TIMESTAMP
FROM "Empire" e
ON CONFLICT ("empireId", "type") DO NOTHING;
