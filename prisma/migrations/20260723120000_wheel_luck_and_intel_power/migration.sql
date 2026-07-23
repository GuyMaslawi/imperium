-- Wheel-luck upgrade + deterministic intelligence power.
--
-- 1) A new WHEEL_LUCK empire upgrade: +1% per level (max 10) to the chance of
--    winning a wheel-of-fortune spin from throwing an item or a winning attack.
-- 2) Spy missions are now resolved deterministically by comparing intelligence
--    power, so SpyReport records the attacker's and defender's intel power.

-- AlterEnum: recreate so the new value is usable for the backfill inserts
-- inside this same migration transaction.
CREATE TYPE "EmpireUpgradeType_new" AS ENUM ('CITIZEN_GROWTH', 'DIAMOND_YIELD', 'INTELLIGENCE', 'BANK_DEPOSIT_COUNT', 'BANK_DAILY_INTEREST', 'TURNS_PER_REGULAR_UPDATE', 'WHEEL_LUCK');
ALTER TABLE "EmpireUpgrade" ALTER COLUMN "type" TYPE "EmpireUpgradeType_new" USING ("type"::text::"EmpireUpgradeType_new");
ALTER TYPE "EmpireUpgradeType" RENAME TO "EmpireUpgradeType_old";
ALTER TYPE "EmpireUpgradeType_new" RENAME TO "EmpireUpgradeType";
DROP TYPE "EmpireUpgradeType_old";

-- Backfill: the wheel-luck upgrade at level 1 for every existing empire.
INSERT INTO "EmpireUpgrade" ("id", "empireId", "type", "level", "updatedAt")
SELECT gen_random_uuid()::text, e."id", 'WHEEL_LUCK', 1, CURRENT_TIMESTAMP
FROM "Empire" e
ON CONFLICT ("empireId", "type") DO NOTHING;

-- AlterTable: record the deterministic intel-power comparison on spy reports.
ALTER TABLE "SpyReport" ADD COLUMN "attackerIntel" DOUBLE PRECISION;
ALTER TABLE "SpyReport" ADD COLUMN "defenderIntel" DOUBLE PRECISION;

-- AlterTable: flag winning attacks that also awarded a wheel-of-fortune spin.
ALTER TABLE "BattleReport" ADD COLUMN "wonWheelSpin" BOOLEAN NOT NULL DEFAULT false;
