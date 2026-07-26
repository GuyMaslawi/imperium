-- CreateEnum
CREATE TYPE "HeroClass" AS ENUM ('WARLORD', 'GUARDIAN', 'MERCHANT', 'SHADOW');

-- AlterTable
ALTER TABLE "Hero" ADD COLUMN     "heroClass" "HeroClass" NOT NULL DEFAULT 'WARLORD';
