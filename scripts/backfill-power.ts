/**
 * One-off backfill of Empire.militaryPower / generalPower / spyPower.
 *
 * The columns default to 0, and every empire self-heals on its owner's next
 * settle (see applyPendingUpdates) — but until then a dormant player ranks at
 * zero, which is visibly wrong rather than quietly stale. Run this once after
 * deploying the migration.
 *
 *   npx tsx scripts/backfill-power.ts
 *
 * Safe to run repeatedly: it recomputes from the army and arsenal, so it is
 * idempotent and can also be used to verify no drift has crept in.
 */
import { backfillAllEmpirePower } from "../src/server/empirePower";

backfillAllEmpirePower()
  .then(({ updated }) => {
    console.log(`Power backfilled for ${updated} empire(s).`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
