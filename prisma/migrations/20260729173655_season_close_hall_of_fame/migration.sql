-- AlterTable
ALTER TABLE "GameSeason" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "recap" JSONB;

-- CreateTable
CREATE TABLE "SeasonChampion" (
    "seasonId" TEXT NOT NULL,
    "seasonName" TEXT NOT NULL,
    "seasonStartsAt" TIMESTAMP(3) NOT NULL,
    "seasonEndsAt" TIMESTAMP(3) NOT NULL,
    "id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "empireId" TEXT,
    "empireName" TEXT NOT NULL,
    "playerName" TEXT,
    "guildName" TEXT,
    "power" DOUBLE PRECISION NOT NULL,
    "cities" INTEGER NOT NULL,
    "heroLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonChampion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeasonChampion_seasonEndsAt_idx" ON "SeasonChampion"("seasonEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonChampion_seasonId_rank_key" ON "SeasonChampion"("seasonId", "rank");
