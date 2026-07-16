-- Enslavement: winning attacks against a defender with 20+ soldiers capture
-- part of them into the attacker's free mine-slave pool.
ALTER TABLE "BattleReport" ADD COLUMN "enslavedSoldiers" INTEGER NOT NULL DEFAULT 0;
