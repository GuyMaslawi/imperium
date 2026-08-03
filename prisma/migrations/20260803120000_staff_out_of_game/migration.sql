-- Staff accounts are not contestants: unattackable, unspyable, and absent from
-- every ranked or archived view. Denormalised from "User"."role" so the boards
-- keep their indexed ORDER BY … LIMIT instead of growing a join.
ALTER TABLE "Empire" ADD COLUMN "isStaff" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: every existing admin's empire leaves the game immediately.
UPDATE "Empire" SET "isStaff" = true
WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" = 'ADMIN');

CREATE INDEX "Empire_isStaff_generalPower_idx" ON "Empire"("isStaff", "generalPower");
CREATE INDEX "Empire_isStaff_spyPower_idx" ON "Empire"("isStaff", "spyPower");
CREATE INDEX "Empire_isStaff_cities_militaryPower_idx" ON "Empire"("isStaff", "cities", "militaryPower");

