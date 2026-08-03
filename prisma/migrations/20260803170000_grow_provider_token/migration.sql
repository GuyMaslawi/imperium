-- Hold the gateway's per-order lookup credential on the purchase row.
--
-- Grow issues a `processToken` alongside the order id, and its order-lookup call
-- is authenticated by that pair. Settlement re-asks Grow what an order is worth
-- rather than trusting the unsigned callback body or the browser's return, so
-- the token has to outlive the request that created it.
--
-- Nullable and unindexed: it is a credential, not an identifier. A unique index
-- here would turn a token collision into a rejected payment, and nothing ever
-- looks a purchase up by it — the lookup key stays `providerRef`.
ALTER TABLE "DiamondPurchase"
  ADD COLUMN "providerToken" TEXT;
