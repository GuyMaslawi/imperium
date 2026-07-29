-- AlterTable
ALTER TABLE "Empire" ADD COLUMN     "militaryPower" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "generalPower" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "spyPower" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Empire_cities_militaryPower_idx" ON "Empire"("cities", "militaryPower");

-- CreateIndex
CREATE INDEX "Empire_generalPower_idx" ON "Empire"("generalPower");

-- CreateIndex
CREATE INDEX "Empire_spyPower_idx" ON "Empire"("spyPower");
