-- CreateEnum
CREATE TYPE "GuildWarStatus" AS ENUM ('SCHEDULED', 'SETTLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GuildWar" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "GuildWarStatus" NOT NULL DEFAULT 'SCHEDULED',
    "resolvedRounds" INTEGER NOT NULL DEFAULT 0,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildWar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildWarEntry" (
    "id" TEXT NOT NULL,
    "warId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "guildName" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "rewardLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildWarEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildWarClash" (
    "id" TEXT NOT NULL,
    "warId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "attackerGuildId" TEXT NOT NULL,
    "attackerGuildName" TEXT NOT NULL,
    "defenderGuildId" TEXT NOT NULL,
    "defenderGuildName" TEXT NOT NULL,
    "attackerEmpireId" TEXT NOT NULL,
    "attackerName" TEXT NOT NULL,
    "defenderEmpireId" TEXT NOT NULL,
    "defenderName" TEXT NOT NULL,
    "attackerPower" DOUBLE PRECISION NOT NULL,
    "defenderPower" DOUBLE PRECISION NOT NULL,
    "won" BOOLEAN NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildWarClash_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildWar_startsAt_key" ON "GuildWar"("startsAt");

-- CreateIndex
CREATE INDEX "GuildWar_status_endsAt_idx" ON "GuildWar"("status", "endsAt");

-- CreateIndex
CREATE INDEX "GuildWarEntry_warId_score_idx" ON "GuildWarEntry"("warId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "GuildWarEntry_warId_guildId_key" ON "GuildWarEntry"("warId", "guildId");

-- CreateIndex
CREATE INDEX "GuildWarClash_warId_createdAt_idx" ON "GuildWarClash"("warId", "createdAt");

-- CreateIndex
CREATE INDEX "GuildWarClash_warId_round_idx" ON "GuildWarClash"("warId", "round");

-- CreateIndex
CREATE INDEX "GuildWarClash_warId_attackerEmpireId_idx" ON "GuildWarClash"("warId", "attackerEmpireId");

-- CreateIndex
CREATE INDEX "GuildWarClash_warId_defenderEmpireId_idx" ON "GuildWarClash"("warId", "defenderEmpireId");

-- AddForeignKey
ALTER TABLE "GuildWarEntry" ADD CONSTRAINT "GuildWarEntry_warId_fkey" FOREIGN KEY ("warId") REFERENCES "GuildWar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildWarClash" ADD CONSTRAINT "GuildWarClash_warId_fkey" FOREIGN KEY ("warId") REFERENCES "GuildWar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
