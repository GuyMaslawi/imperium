-- VIP (חותם המלוכה): a one-off, never-expiring convenience pass.
--
-- The timestamp is the entitlement, not a window: it records *when* it was
-- bought (useful in support and in the admin ledger) and everything that gates
-- on VIP only asks whether it is NULL. Additive and nullable, so every existing
-- empire reads back as "not VIP", which is exactly right.
ALTER TABLE "Empire" ADD COLUMN "vipSince" TIMESTAMP(3);
