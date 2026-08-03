-- Record what each champion was paid when the season was sealed.
--
-- The amount is stored per row rather than derived from SEASON_PRIZES at read
-- time on purpose: the prize table is a game-balance constant that will change,
-- and a past champion's record must keep saying what actually reached his
-- account. `prizePaidAt` is the idempotence guard for the payout itself — the
-- credit only runs against rows where it is still NULL.
--
-- Both columns are additive with defaults, so every season already in the hall
-- reads back as "archived, never paid", which is exactly what happened.
ALTER TABLE "SeasonChampion"
  ADD COLUMN "prizeDiamonds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "prizePaidAt" TIMESTAMP(3);
