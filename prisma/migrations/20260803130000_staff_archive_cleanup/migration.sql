-- Archives written before the staff rule existed can still name a staff empire
-- on the season podium or in היכל התהילה. Those are frozen snapshots — the
-- boards read these rows directly and the empires behind them may be long
-- deleted — so there is nothing to recompute; the offending rows are dropped.
--
-- Dropping rather than renumbering: "SeasonBoardEntry" is unique on
-- (seasonId, kind, rank) and both boards render whatever ranks they find, so a
-- gap shows up as a shorter board — honest — whereas re-ranking would rewrite
-- placements players were already told they had.
--
-- Its own migration, separate from 20260803120000_staff_out_of_game, because
-- that one is already applied: editing an applied migration changes its
-- checksum and every later `prisma migrate deploy` fails on the mismatch.
DELETE FROM "SeasonChampion"
WHERE "empireId" IN (SELECT "id" FROM "Empire" WHERE "isStaff" = true);

DELETE FROM "SeasonBoardEntry"
WHERE "empireId" IN (SELECT "id" FROM "Empire" WHERE "isStaff" = true);
