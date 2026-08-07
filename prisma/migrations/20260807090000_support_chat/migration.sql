-- Support chat: a conversation with somebody who is not in the game yet.
--
-- The people who most need to reach a human are the ones the rest of the app
-- cannot see — an unverified address, a password that will not reset, a Google
-- account that will not link, a ban to argue, a payment made from an account
-- that cannot log in. All of that happens in front of the session, so none of
-- it can use the in-game chat, which is addressed by empire id.
--
-- Nothing here carries a foreign key to User or Empire on purpose: a ticket has
-- to outlive the account it is about, and a season reset deletes every empire
-- in the game.
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "SupportThread" (
    "id" TEXT NOT NULL,
    -- SHA-256 of the visitor's cookie token, never the token itself.
    "tokenHash" TEXT NOT NULL,
    "email" TEXT,
    "userId" TEXT,
    "empireName" TEXT,
    "path" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staffReadAt" TIMESTAMP(3),
    "visitorReadAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportThread_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportThread_tokenHash_key" ON "SupportThread"("tokenHash");
CREATE INDEX "SupportThread_status_lastMessageAt_idx" ON "SupportThread"("status", "lastMessageAt");
CREATE INDEX "SupportThread_lastMessageAt_idx" ON "SupportThread"("lastMessageAt");

CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "staffId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportMessage_threadId_createdAt_idx" ON "SupportMessage"("threadId", "createdAt");

ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "SupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
