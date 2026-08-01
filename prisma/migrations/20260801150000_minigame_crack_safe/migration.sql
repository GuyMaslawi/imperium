-- "נחש את המספר" is gone: a high/low guessing game has no decisions in it, only
-- a binary search everyone runs identically. It is replaced by CRACK_SAFE — a
-- digit-code lock scored Mastermind-style (right digit right slot / right digit
-- wrong slot / not in the code), which rewards actual reasoning.
--
-- Postgres cannot drop a value out of an enum in place, so the type is rebuilt.
-- Any event of the retired type goes with it; its entries follow by cascade.
DELETE FROM "MiniGameEvent" WHERE "type" = 'GUESS_NUMBER';

ALTER TYPE "MiniGameType" RENAME TO "MiniGameType_old";
CREATE TYPE "MiniGameType" AS ENUM ('FIND_BALL', 'CRACK_SAFE');
ALTER TABLE "MiniGameEvent"
  ALTER COLUMN "type" TYPE "MiniGameType" USING ("type"::text::"MiniGameType");
DROP TYPE "MiniGameType_old";

-- Per-player attempt log. Both games need it now: the safe is unplayable without
-- seeing your earlier codes and their marks, and the cups use it so an already
-- lifted cup stays lifted (and unclickable) after a reload instead of inviting
-- the player to burn a second attempt on a cup they already emptied.
--
-- Private to its owner and answer-free — a row records what *this* player tried
-- and how it scored, never where the ball is.
ALTER TABLE "MiniGameEntry" ADD COLUMN "guesses" JSONB NOT NULL DEFAULT '[]';
