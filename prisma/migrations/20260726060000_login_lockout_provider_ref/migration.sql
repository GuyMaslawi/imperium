-- Durable brute-force counters. The in-process rate limiter cannot throttle
-- login attempts on a serverless fleet (per-instance counters, lost on cold
-- start), so the lockout state lives on the row instead.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLogins" INTEGER NOT NULL DEFAULT 0,
                  ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- Replay protection for payment settlement: one provider reference may settle
-- at most one purchase. Multiple NULLs are still allowed (PENDING rows), which
-- is exactly what we want.
-- CreateIndex
CREATE UNIQUE INDEX "DiamondPurchase_providerRef_key" ON "DiamondPurchase"("providerRef");
