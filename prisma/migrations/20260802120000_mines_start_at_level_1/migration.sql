-- Mines now start built at level 1 instead of level 0.
--
-- A level-0 mine yields nothing (yield = level × 2), so a new player could
-- train mine slaves, assign them, watch the rig animation stay dead and have
-- no idea why. Registration writes level 1 from now on; this lifts every
-- existing level-0 mine to the same floor so nobody is left stuck at zero.
--
-- Only the four production buildings can be at level 0 — the others were
-- always created at level 1 — but the type filter keeps that explicit.
UPDATE "Building"
SET "level" = 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "level" < 1
  AND "type" IN ('GOLD_MINE', 'WOOD_CAMP', 'IRON_MINE', 'STONE_QUARRY');
