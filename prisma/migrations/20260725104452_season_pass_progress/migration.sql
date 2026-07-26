-- CreateTable
CREATE TABLE "SeasonPassProgress" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "seasonId" TEXT,
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "premiumAt" TIMESTAMP(3),
    "cycleStartedAt" TIMESTAMP(3) NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "claimedFree" INTEGER[],
    "claimedPremium" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonPassProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonPassProgress_empireId_key" ON "SeasonPassProgress"("empireId");

-- AddForeignKey
ALTER TABLE "SeasonPassProgress" ADD CONSTRAINT "SeasonPassProgress_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
