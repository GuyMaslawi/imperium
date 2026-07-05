-- Bank upgrade now limits the NUMBER of deposits per daily period, not the amount.
ALTER TYPE "EmpireUpgradeType" RENAME VALUE 'BANK_DEPOSIT_LIMIT' TO 'BANK_DEPOSIT_COUNT';

-- Track deposits used since the last daily update (07:30 / 19:30 Asia/Jerusalem).
ALTER TABLE "BankAccount"
ADD COLUMN "depositsUsedInCurrentPeriod" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "depositPeriodStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
