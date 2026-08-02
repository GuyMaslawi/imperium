-- The community channel's one-time welcome purse.
--
-- Nullable with no default and no backfill: NULL means "has not collected",
-- which is the correct state for every empire that exists today. The column is
-- the receipt for the claim — the payout is a single UPDATE guarded on
-- "discordJoinedAt" IS NULL, so a double click pays once.
--
-- No index. It is only ever read for one empire at a time, by primary key.
ALTER TABLE "Empire" ADD COLUMN "discordJoinedAt" TIMESTAMP(3);
