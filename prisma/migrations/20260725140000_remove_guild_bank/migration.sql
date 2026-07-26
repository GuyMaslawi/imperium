-- The guild bank is gone: guild-wide upgrades are now paid from the buyer's own
-- gold. Refund whatever sits in each treasury to that guild's leader (falling
-- back to the earliest member if a guild somehow has none) so no gold is lost,
-- then drop the treasury column and the bank ledger.
BEGIN;

UPDATE "Empire" e
SET "gold" = e."gold" + refund."goldBalance"
FROM (
  SELECT DISTINCT ON (g."id") g."id" AS "guildId", g."goldBalance", m."empireId"
  FROM "Guild" g
  JOIN "GuildMember" m ON m."guildId" = g."id"
  WHERE g."goldBalance" > 0
  ORDER BY g."id", (m."role" = 'LEADER') DESC, m."createdAt" ASC
) AS refund
WHERE e."id" = refund."empireId";

DROP TABLE "GuildBankTransaction";
DROP TYPE "GuildBankTransactionType";

ALTER TABLE "Guild" DROP COLUMN "goldBalance";

COMMIT;
