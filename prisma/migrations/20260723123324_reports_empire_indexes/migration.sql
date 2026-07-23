-- CreateIndex
CREATE INDEX "BattleReport_attackerEmpireId_createdAt_idx" ON "BattleReport"("attackerEmpireId", "createdAt");

-- CreateIndex
CREATE INDEX "BattleReport_defenderEmpireId_createdAt_idx" ON "BattleReport"("defenderEmpireId", "createdAt");

-- CreateIndex
CREATE INDEX "BattleReport_createdAt_idx" ON "BattleReport"("createdAt");

-- CreateIndex
CREATE INDEX "Empire_cities_lastDailyUpdateAt_idx" ON "Empire"("cities", "lastDailyUpdateAt");

-- CreateIndex
CREATE INDEX "Empire_seasonId_idx" ON "Empire"("seasonId");

-- CreateIndex
CREATE INDEX "SpyReport_attackerEmpireId_createdAt_idx" ON "SpyReport"("attackerEmpireId", "createdAt");

-- CreateIndex
CREATE INDEX "SpyReport_defenderEmpireId_createdAt_idx" ON "SpyReport"("defenderEmpireId", "createdAt");
