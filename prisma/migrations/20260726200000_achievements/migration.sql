-- CreateTable
CREATE TABLE "EmpireAchievement" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpireAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmpireAchievement_empireId_key_key" ON "EmpireAchievement"("empireId", "key");

-- AddForeignKey
ALTER TABLE "EmpireAchievement" ADD CONSTRAINT "EmpireAchievement_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
