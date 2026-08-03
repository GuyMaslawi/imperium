-- Widen the guild-war power snapshot from INTEGER to DOUBLE PRECISION.
--
-- Weapon power now grows 2.5x per tier while cost only doubles, so a single
-- high-tier weapon is already worth billions of power and a guild's summed
-- military power blows past the 2^31 ceiling of an INTEGER long before the end
-- of a season. Writing it would fail the whole advanceWar transaction and stall
-- the nightly campaign. Every other power column in the schema is already a
-- Float; this brings the last one in line.
--
-- Widening is lossless, so existing rows carry over untouched.
ALTER TABLE "GuildWarEntry"
  ALTER COLUMN "power" SET DATA TYPE DOUBLE PRECISION;
