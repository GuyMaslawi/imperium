-- The city boss stopped asking the player for a tactic every round: an assault is
-- now rolled in full at launch and plays out over a minute of real time, and a
-- felled boss revives on its own clock instead of at the daily update.
--
-- In-flight rows describe a fight shape that no longer exists — a live round
-- counter, a committed next move, a fury meter mid-charge — and the two new NOT
-- NULL columns (endsAt, outcome) have no sensible value to backfill for them.
-- There is also nothing to preserve: BossSiege/BossBattle were introduced in the
-- previous migration and have never been deployed. Settled reports live in
-- BossFight, which this migration does not touch.
DELETE FROM "BossBattle";
DELETE FROM "BossSiege";

-- DropIndex
DROP INDEX "BossSiege_empireId_cityTier_cycleAt_key";

-- AlterTable
ALTER TABLE "BossBattle" DROP COLUMN "fury",
DROP COLUMN "nextMove",
ADD COLUMN     "endsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "outcome" "BossBattleStatus" NOT NULL,
ALTER COLUMN "round" DROP DEFAULT,
ALTER COLUMN "soldiersLost" DROP DEFAULT,
ALTER COLUMN "damageDealt" DROP DEFAULT,
ALTER COLUMN "correctCounters" DROP DEFAULT,
ALTER COLUMN "decisions" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BossSiege" DROP COLUMN "cycleAt",
ADD COLUMN     "revivesAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BossBattle_status_endsAt_idx" ON "BossBattle"("status", "endsAt");

-- CreateIndex
CREATE INDEX "BossSiege_empireId_cityTier_createdAt_idx" ON "BossSiege"("empireId", "cityTier", "createdAt");

