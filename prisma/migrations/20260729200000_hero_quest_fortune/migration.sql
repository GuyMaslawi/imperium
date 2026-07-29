-- The luck band drawn for a quest at departure; the homecoming line names it.
-- Existing rows were priced by the old flat table, which is exactly "plain".
ALTER TABLE "HeroQuest" ADD COLUMN "fortune" TEXT NOT NULL DEFAULT 'plain';
