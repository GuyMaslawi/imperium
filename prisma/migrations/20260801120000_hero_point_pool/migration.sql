-- Hero stat points are now an invariant rather than a running total: a hero is
-- owed one point per level he *stands at* (level 1 included, so a newborn hero
-- already holds one) plus 25 for every reset behind him — the reset grants stack
-- instead of only the most recent one surviving. See heroPointPool in
-- src/lib/game/hero.ts.
--
-- The default follows the level-1 case.
ALTER TABLE "Hero" ALTER COLUMN "unspentPoints" SET DEFAULT 1;

-- Backfill every hero who is holding less than the pool owes him — the case that
-- prompted this (a level-16 hero with 9 points, left behind by an admin edit that
-- raised the level without touching the point columns). Only shortfalls are paid;
-- a hero holding more is left alone rather than being silently weakened.
-- applyPendingUpdates performs the same repair lazily from here on, so this is
-- only about not making the players wait for their next page load.
UPDATE "Hero"
SET "unspentPoints" = "unspentPoints" + (
      LEAST("level", 100) + "resets" * 25
      - ("unspentPoints" + "attackPoints" + "defensePoints" + "resourcePoints")
    )
WHERE LEAST("level", 100) + "resets" * 25
      > "unspentPoints" + "attackPoints" + "defensePoints" + "resourcePoints";
