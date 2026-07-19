-- CreateEnum
CREATE TYPE "MiniGameType" AS ENUM ('GUESS_NUMBER', 'FIND_BALL');

-- CreateTable
CREATE TABLE "MiniGameEvent" (
    "id" TEXT NOT NULL,
    "type" "MiniGameType" NOT NULL,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "maxWinners" INTEGER NOT NULL DEFAULT 0,
    "winnersCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "prizeGold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prizeWood" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prizeIron" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prizeStone" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prizeDiamonds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prizeCitizens" INTEGER NOT NULL DEFAULT 0,
    "prizeTurns" INTEGER NOT NULL DEFAULT 0,
    "prizeWheelSpins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniGameEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiniGameEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "wonAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniGameEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MiniGameEvent_isActive_idx" ON "MiniGameEvent"("isActive");

-- CreateIndex
CREATE INDEX "MiniGameEntry_eventId_idx" ON "MiniGameEntry"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "MiniGameEntry_eventId_empireId_key" ON "MiniGameEntry"("eventId", "empireId");

-- AddForeignKey
ALTER TABLE "MiniGameEntry" ADD CONSTRAINT "MiniGameEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MiniGameEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
