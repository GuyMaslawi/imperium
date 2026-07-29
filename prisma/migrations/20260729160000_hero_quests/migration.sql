-- CreateTable
CREATE TABLE "HeroQuest" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "turnsSpent" INTEGER NOT NULL,
    "rewardGold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardWood" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardIron" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardStone" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardCitizens" INTEGER NOT NULL DEFAULT 0,
    "rewardSlaves" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroQuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HeroQuest_empireId_key" ON "HeroQuest"("empireId");

-- AddForeignKey
ALTER TABLE "HeroQuest" ADD CONSTRAINT "HeroQuest_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
