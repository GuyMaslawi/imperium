-- Timed mini-game releases: an optional deadline the event auto-expires at,
-- plus the admin's last chosen duration so re-activating reuses it.
ALTER TABLE "MiniGameEvent" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MiniGameEvent" ADD COLUMN "endsAt" TIMESTAMP(3);
