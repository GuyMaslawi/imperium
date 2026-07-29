-- AlterEnum
ALTER TYPE "DiamondEffectKind" ADD VALUE 'SHIELD_RESOURCES';
ALTER TYPE "DiamondEffectKind" ADD VALUE 'SHIELD_SOLDIERS';

-- AlterTable
ALTER TABLE "BattleReport" ADD COLUMN     "defenderResourceShielded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defenderSoldierShielded" BOOLEAN NOT NULL DEFAULT false;
