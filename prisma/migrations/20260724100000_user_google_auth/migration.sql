-- AlterTable: allow password-less (Google-only) accounts and store Google identity
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN     "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN     "image" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
