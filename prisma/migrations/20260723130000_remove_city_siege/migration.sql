-- Remove the CITY_SIEGE value from DiamondEffectKind (feature deleted).
-- Postgres can't DROP an enum value in place, so swap the type. No rows use
-- CITY_SIEGE (the city-siege effect rows were deleted before this migration).
BEGIN;
CREATE TYPE "DiamondEffectKind_new" AS ENUM (
  'RESOURCE_BOOST_GOLD',
  'RESOURCE_BOOST_WOOD',
  'RESOURCE_BOOST_IRON',
  'RESOURCE_BOOST_STONE',
  'SHOP_DISCOUNT',
  'BANK_INTEREST',
  'TURN_PACK_1',
  'TURN_PACK_2',
  'TURN_PACK_3',
  'TURN_PACK_4'
);
ALTER TABLE "DiamondEffect"
  ALTER COLUMN "kind" TYPE "DiamondEffectKind_new"
  USING ("kind"::text::"DiamondEffectKind_new");
ALTER TYPE "DiamondEffectKind" RENAME TO "DiamondEffectKind_old";
ALTER TYPE "DiamondEffectKind_new" RENAME TO "DiamondEffectKind";
DROP TYPE "DiamondEffectKind_old";
COMMIT;
