-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "signupIp" TEXT;

-- CreateIndex
CREATE INDEX "User_signupIp_idx" ON "User"("signupIp");

-- CreateIndex
CREATE INDEX "User_lastLoginIp_idx" ON "User"("lastLoginIp");
