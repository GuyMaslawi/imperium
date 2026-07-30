-- CreateTable
CREATE TABLE "ChatTyping" (
    "empireId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "toEmpireId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatTyping_pkey" PRIMARY KEY ("empireId")
);

-- CreateIndex
CREATE INDEX "ChatTyping_toEmpireId_updatedAt_idx" ON "ChatTyping"("toEmpireId", "updatedAt");

-- AddForeignKey
ALTER TABLE "ChatTyping" ADD CONSTRAINT "ChatTyping_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
