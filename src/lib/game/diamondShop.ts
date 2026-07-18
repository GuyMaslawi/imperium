import type { DiamondEffectKind } from "@prisma/client";
import type { StorableResource } from "./constants";

/* ------------------------------ resource boosts ------------------------------ */

/** Each purchase raises a resource's production boost by this much… */
export const BOOST_STEP_PCT = 25;
/** …up to this cap, per resource. */
export const BOOST_MAX_PCT = 200;
/** How long the whole boost stays active; each purchase resets the timer. */
export const BOOST_DURATION_HOURS = 24;
export const BOOST_DURATION_MS = BOOST_DURATION_HOURS * 3_600_000;
/** Diamonds per +25% step (flat). */
export const BOOST_STEP_COST = 40;

/** DiamondEffectKind that stores each resource's boost. */
export const RESOURCE_BOOST_KIND: Record<StorableResource, DiamondEffectKind> = {
  gold: "RESOURCE_BOOST_GOLD",
  wood: "RESOURCE_BOOST_WOOD",
  iron: "RESOURCE_BOOST_IRON",
  stone: "RESOURCE_BOOST_STONE",
};

export const BOOSTABLE_RESOURCES: StorableResource[] = ["gold", "wood", "iron", "stone"];

/* ------------------------------ shop discount ------------------------------ */

export const SHOP_DISCOUNT_PCT = 20;
export const SHOP_DISCOUNT_DURATION_HOURS = 24;
export const SHOP_DISCOUNT_DURATION_MS = SHOP_DISCOUNT_DURATION_HOURS * 3_600_000;
export const SHOP_DISCOUNT_COST = 150;

export interface ResourceCost {
  gold: number;
  wood: number;
  iron: number;
  stone: number;
}

/** Apply the shop discount % to a {gold,wood,iron,stone} cost, rounded up. */
export function applyShopDiscount(cost: ResourceCost, discountPct: number): ResourceCost {
  if (discountPct <= 0) return cost;
  const factor = 1 - discountPct / 100;
  return {
    gold: Math.ceil(cost.gold * factor),
    wood: Math.ceil(cost.wood * factor),
    iron: Math.ceil(cost.iron * factor),
    stone: Math.ceil(cost.stone * factor),
  };
}

/* ------------------------------ turn packages ------------------------------ */

export interface TurnPackage {
  turns: number;
  cost: number; // diamonds
}

export const TURN_PACKAGES: TurnPackage[] = [
  { turns: 100, cost: 40 },
  { turns: 300, cost: 100 },
  { turns: 800, cost: 240 },
  { turns: 2000, cost: 500 },
];

/* ------------------------------ hero points reset ------------------------------ */

/** Diamonds to refund all allocated hero points to "unspent" (once/season). */
export const HERO_POINTS_RESET_COST = 100;

/* ------------------------------ bank interest spell ------------------------------ */

export const BANK_INTEREST_SPELL_COST = 60;
export const BANK_INTEREST_COOLDOWN_HOURS = 24;
export const BANK_INTEREST_COOLDOWN_MS = BANK_INTEREST_COOLDOWN_HOURS * 3_600_000;

/* ------------------------------ city spell (coming soon) ------------------------------ */

/** The "descend a city" spell is a scaffold until the cities system lands. */
export const CITY_SPELL_COOLDOWN_HOURS = 1;
export const CITY_SPELL_ENABLED = false;
