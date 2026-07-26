-- CreateTable
CREATE TABLE "BossFight" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "cityTier" INTEGER NOT NULL,
    "bossKey" TEXT NOT NULL,
    "victory" BOOLEAN NOT NULL,
    "attackerPower" DOUBLE PRECISION NOT NULL,
    "bossPower" DOUBLE PRECISION NOT NULL,
    "soldiersLost" INTEGER NOT NULL,
    "turnsSpent" INTEGER NOT NULL,
    "rewardGold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardWood" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardIron" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardStone" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardSlaves" INTEGER NOT NULL DEFAULT 0,
    "heroBonusPct" DOUBLE PRECISION,
    "guildBonusPct" DOUBLE PRECISION,
    "heroXp" INTEGER NOT NULL DEFAULT 0,
    "droppedItemSlot" "HeroItemSlot",
    "droppedItemLevel" INTEGER,
    "droppedItemRarity" "HeroRarity",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BossFight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BossFight_empireId_createdAt_idx" ON "BossFight"("empireId", "createdAt");

-- CreateIndex
CREATE INDEX "BossFight_cityTier_victory_createdAt_idx" ON "BossFight"("cityTier", "victory", "createdAt");

-- AddForeignKey
ALTER TABLE "BossFight" ADD CONSTRAINT "BossFight_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
