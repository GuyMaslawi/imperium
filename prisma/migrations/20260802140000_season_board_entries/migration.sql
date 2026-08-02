-- היכל התהילה's three boards: כוח כללי, ריגול, הברית החזקה.
--
-- A pure archive table, written once per season at closing time and never
-- updated. No foreign keys on purpose — it has to outlive the empires (a season
-- reset deletes every one of them), the guilds, and the GameSeason row itself,
-- exactly like "SeasonChampion" next to it.
--
-- The unique on (seasonId, kind, rank) is what makes archiving idempotent: a
-- season can be archived twice (the admin saving standings before a reset, then
-- the clock running out), and the second pass must not rewrite a published hall.

-- CreateEnum
CREATE TYPE "SeasonBoardKind" AS ENUM ('POWER', 'SPY', 'GUILD');

-- CreateTable
CREATE TABLE "SeasonBoardEntry" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "seasonName" TEXT NOT NULL,
    "seasonStartsAt" TIMESTAMP(3) NOT NULL,
    "seasonEndsAt" TIMESTAMP(3) NOT NULL,
    "kind" "SeasonBoardKind" NOT NULL,
    "rank" INTEGER NOT NULL,
    "empireId" TEXT,
    "name" TEXT NOT NULL,
    "playerName" TEXT,
    "note" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonBoardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonBoardEntry_seasonId_kind_rank_key" ON "SeasonBoardEntry"("seasonId", "kind", "rank");

-- CreateIndex
CREATE INDEX "SeasonBoardEntry_seasonEndsAt_idx" ON "SeasonBoardEntry"("seasonEndsAt");
