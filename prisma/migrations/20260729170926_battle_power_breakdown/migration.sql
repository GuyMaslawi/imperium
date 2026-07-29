-- AlterTable
ALTER TABLE "BattleReport" ADD COLUMN     "attackerGuildAidPct" DOUBLE PRECISION,
ADD COLUMN     "attackerGuildAidPower" DOUBLE PRECISION,
ADD COLUMN     "defenderGuildAidPct" DOUBLE PRECISION,
ADD COLUMN     "defenderGuildAidPower" DOUBLE PRECISION,
ADD COLUMN     "defenseBonusPct" DOUBLE PRECISION;
