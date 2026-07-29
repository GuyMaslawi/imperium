-- CreateTable
-- Automatic world decorations for the capstone board on /game/base. Separate
-- from EmpireAchievement because these are never collected: they light up when
-- the condition is met, so the arrival stamp must not be a claim receipt.
CREATE TABLE "EmpireGloryAward" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpireGloryAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmpireGloryAward_empireId_key_key" ON "EmpireGloryAward"("empireId", "key");

-- CreateIndex
CREATE INDEX "EmpireGloryAward_key_awardedAt_idx" ON "EmpireGloryAward"("key", "awardedAt");

-- AddForeignKey
ALTER TABLE "EmpireGloryAward" ADD CONSTRAINT "EmpireGloryAward_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: an empire that already collected one of these capstones demonstrably
-- reached it, and its claim time is the best arrival stamp on record. Without
-- this, every world record set before the board existed would read as open.
-- Empires that reached a capstone but never collected it are not recoverable
-- here (the condition lives in JS, not SQL); they are stamped on their next
-- base-screen load, which is exactly how the board works from now on.
INSERT INTO "EmpireGloryAward" ("id", "empireId", "key", "awardedAt")
SELECT gen_random_uuid()::text, a."empireId", a."key", a."claimedAt"
FROM "EmpireAchievement" a
WHERE a."key" IN (
  'cities_10', 'herolvl_100', 'minelvl_250', 'arsenal_90',
  'heroreset_1', 'all_bosses', 'rank_one'
)
ON CONFLICT ("empireId", "key") DO NOTHING;
