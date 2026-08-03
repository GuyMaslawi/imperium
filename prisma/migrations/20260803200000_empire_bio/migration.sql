-- The player's own words on their dossier. Nullable with no default: an empty
-- submission clears it back to NULL rather than storing a blank string.
ALTER TABLE "Empire" ADD COLUMN "bio" TEXT;
