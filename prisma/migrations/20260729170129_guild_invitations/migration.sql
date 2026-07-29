-- CreateTable
CREATE TABLE "GuildInvite" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "empireId" TEXT NOT NULL,
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuildInvite_empireId_expiresAt_idx" ON "GuildInvite"("empireId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuildInvite_guildId_empireId_key" ON "GuildInvite"("guildId", "empireId");

-- AddForeignKey
ALTER TABLE "GuildInvite" ADD CONSTRAINT "GuildInvite_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildInvite" ADD CONSTRAINT "GuildInvite_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildInvite" ADD CONSTRAINT "GuildInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "Empire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
