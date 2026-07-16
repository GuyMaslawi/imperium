-- Guild system: name-only guilds (no tag) with a shared gold bank
-- (deposit/withdraw + ledger), roles (leader/deputy/member), expandable
-- capacity (starts at 2 members), and a diamond shop of four spells
-- (attack/defense/spy/resources). Each spell has a per-guild level
-- (level = bonus %, 1..20 — "guild help" is capped at 20%); casting grants
-- the caster a 24h personal buff snapshotted at the current %.

-- CreateEnum
CREATE TYPE "GuildRole" AS ENUM ('LEADER', 'DEPUTY', 'MEMBER');

-- CreateEnum
CREATE TYPE "GuildSpellType" AS ENUM ('ATTACK', 'DEFENSE', 'SPY', 'RESOURCES');

-- CreateEnum
CREATE TYPE "GuildBankTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW');

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goldBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capacityLevel" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "role" "GuildRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildSpell" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" "GuildSpellType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildSpell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildSpellBuff" (
    "id" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "type" "GuildSpellType" NOT NULL,
    "bonusPct" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildSpellBuff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildBankTransaction" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "empireName" TEXT NOT NULL,
    "type" "GuildBankTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildBankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_empireId_key" ON "GuildMember"("empireId");

-- CreateIndex
CREATE INDEX "GuildMember_guildId_idx" ON "GuildMember"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildSpell_guildId_type_key" ON "GuildSpell"("guildId", "type");

-- CreateIndex
CREATE INDEX "GuildSpellBuff_empireId_expiresAt_idx" ON "GuildSpellBuff"("empireId", "expiresAt");

-- CreateIndex
CREATE INDEX "GuildBankTransaction_guildId_createdAt_idx" ON "GuildBankTransaction"("guildId", "createdAt");

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildSpell" ADD CONSTRAINT "GuildSpell_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildSpellBuff" ADD CONSTRAINT "GuildSpellBuff_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildBankTransaction" ADD CONSTRAINT "GuildBankTransaction_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Guild bonuses on combat reports (display breakdown, like the hero columns).
ALTER TABLE "BattleReport" ADD COLUMN "attackerGuildBonusPct" DOUBLE PRECISION,
ADD COLUMN "defenderGuildBonusPct" DOUBLE PRECISION;

ALTER TABLE "SpyReport" ADD COLUMN "guildBonus" DOUBLE PRECISION;
