-- Happy Hour: one global window in which every player's battle XP, plunder
-- (raids + city bosses) and mine output are multiplied by the same admin-chosen
-- bonus. Enforced on read against startsAt/endsAt — no scheduler.
--
-- Closed rows are kept, not deleted: the lazy mine clock settles a backlog of
-- 5-minute ticks, and it has to be able to look back at a window that opened
-- and closed while the player was offline to pay only the ticks inside it.
CREATE TABLE "HappyHour" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bonusPct" INTEGER NOT NULL DEFAULT 100,
    "boostXp" BOOLEAN NOT NULL DEFAULT true,
    "boostPlunder" BOOLEAN NOT NULL DEFAULT true,
    "boostMines" BOOLEAN NOT NULL DEFAULT true,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HappyHour_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HappyHour_isActive_idx" ON "HappyHour"("isActive");

-- The backlog lookup asks "which windows overlap (lastUpdate, now]" — an
-- endsAt range scan, on every page load that settles a tick.
CREATE INDEX "HappyHour_endsAt_idx" ON "HappyHour"("endsAt");
