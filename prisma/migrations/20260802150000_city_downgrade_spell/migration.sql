-- The city-downgrade spell ("קסם ירידת עיר"): 500 diamonds to give up exactly
-- one city tier, once an hour. Its cooldown lives in a DiamondEffect row's
-- `readyAt`, so the kind needs an enum value of its own.
--
-- ADD VALUE (rather than the swap-the-type dance) because nothing is being
-- removed; Postgres 12+ allows it inside the transaction Prisma wraps a
-- migration in, as long as the new value is not *used* in the same transaction.
ALTER TYPE "DiamondEffectKind" ADD VALUE 'CITY_DOWNGRADE';
