-- Bot empires: garrisons an admin plants in a city tier.
--
-- Combat is confined to your own tier, so the first player to climb into a high
-- city finds a ladder with one row on it — their own — and can neither attack
-- nor spy anybody until a second player arrives. A bot is a resident of that
-- tier: it stands in the city ladder, it can be raided and scouted, its mines
-- produce real loot, and it rebuilds its own garrison after it is farmed.
--
-- The flag is a plain column rather than `EmpireBot IS NOT NULL` for the reason
-- "isStaff" is one: every board is an indexed ORDER BY … LIMIT, and a relation
-- filter would turn each of them into a join. Additive and defaulted, so every
-- existing empire reads back as a player — which is exactly right.
ALTER TABLE "Empire" ADD COLUMN "isBot" BOOLEAN NOT NULL DEFAULT false;

-- The garrison a bot is rebuilt to. Stored rather than merely created: a raid
-- takes soldiers off it, and without a record of what it was built with the
-- refill would have nothing to restore. "restoredAt" is both the cooldown and
-- the concurrency claim — the refill guards its UPDATE on the exact value it
-- read, so two raiders arriving together cannot both rebuild.
CREATE TABLE "EmpireBot" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "targetPower" DOUBLE PRECISION NOT NULL,
    "soldiers" INTEGER NOT NULL,
    "spies" INTEGER NOT NULL,
    "weaponTier" INTEGER NOT NULL,
    "attackWeapons" INTEGER NOT NULL,
    "defenseWeapons" INTEGER NOT NULL,
    "spyWeapons" INTEGER NOT NULL,
    "restoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpireBot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmpireBot_empireId_key" ON "EmpireBot"("empireId");

ALTER TABLE "EmpireBot" ADD CONSTRAINT "EmpireBot_empireId_fkey"
    FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
