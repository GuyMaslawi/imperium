-- Remove the guild spy spell.
--
-- A guild had no business tilting spy missions: they are meant to be settled by
-- intelligence power alone, and the spell let a guild buy a flat percentage on
-- top of that. Three spells remain — attack, defence and resources.
--
-- The rows holding the value have to go BEFORE the enum is rebuilt: the cast
-- below has no 'SPY' to land on and would abort the whole migration.
-- `SpyReport.guildBonus` is deliberately left alone — it is a Float, not this
-- enum, and old reports keep itemising the bonus they were decided by.
DELETE FROM "GuildSpellBuff" WHERE "type" = 'SPY';
DELETE FROM "GuildSpell" WHERE "type" = 'SPY';

-- AlterEnum
BEGIN;
CREATE TYPE "GuildSpellType_new" AS ENUM ('ATTACK', 'DEFENSE', 'RESOURCES');
ALTER TABLE "GuildSpell" ALTER COLUMN "type" TYPE "GuildSpellType_new" USING ("type"::text::"GuildSpellType_new");
ALTER TABLE "GuildSpellBuff" ALTER COLUMN "type" TYPE "GuildSpellType_new" USING ("type"::text::"GuildSpellType_new");
ALTER TYPE "GuildSpellType" RENAME TO "GuildSpellType_old";
ALTER TYPE "GuildSpellType_new" RENAME TO "GuildSpellType";
DROP TYPE "GuildSpellType_old";
COMMIT;
