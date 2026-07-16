-- Diamond yield: a dedicated empire upgrade that grants diamonds on every
-- daily update (07:30 / 19:30 Asia/Jerusalem).

-- AlterEnum: recreate so the new value is usable for the backfill inserts
-- inside this same migration transaction.
CREATE TYPE "EmpireUpgradeType_new" AS ENUM ('CITIZEN_GROWTH', 'DIAMOND_YIELD', 'INTELLIGENCE', 'BANK_DEPOSIT_COUNT', 'BANK_DAILY_INTEREST', 'TURNS_PER_REGULAR_UPDATE');
ALTER TABLE "EmpireUpgrade" ALTER COLUMN "type" TYPE "EmpireUpgradeType_new" USING ("type"::text::"EmpireUpgradeType_new");
ALTER TYPE "EmpireUpgradeType" RENAME TO "EmpireUpgradeType_old";
ALTER TYPE "EmpireUpgradeType_new" RENAME TO "EmpireUpgradeType";
DROP TYPE "EmpireUpgradeType_old";

-- Backfill: the diamond-yield upgrade at level 1 for every existing empire
INSERT INTO "EmpireUpgrade" ("id", "empireId", "type", "level", "updatedAt")
SELECT gen_random_uuid()::text, e."id", 'DIAMOND_YIELD', 1, CURRENT_TIMESTAMP
FROM "Empire" e
ON CONFLICT ("empireId", "type") DO NOTHING;
