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

/** Apply the shop discount % to a single amount, rounded up (matches purchase math). */
export function discountedAmount(amount: number, discountPct: number): number {
  if (discountPct <= 0) return amount;
  return Math.ceil(amount * (1 - discountPct / 100));
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
  /** How long this package stays on cooldown after buying it. */
  cooldownHours: number;
  /** DiamondEffectKind holding this package's personal cooldown. */
  cooldownKind: DiamondEffectKind;
}

/**
 * Turn packages, cheapest → largest. Each package has its own independent
 * cooldown that grows with the size of the package, so the largest one can only
 * be bought once every 12 hours while small top-ups recharge quickly.
 */
export const TURN_PACKAGES: TurnPackage[] = [
  { turns: 100, cost: 40, cooldownHours: 1, cooldownKind: "TURN_PACK_1" },
  { turns: 300, cost: 100, cooldownHours: 3, cooldownKind: "TURN_PACK_2" },
  { turns: 800, cost: 240, cooldownHours: 6, cooldownKind: "TURN_PACK_3" },
  { turns: 2000, cost: 500, cooldownHours: 12, cooldownKind: "TURN_PACK_4" },
];

export const TURN_PACKAGE_KINDS: DiamondEffectKind[] = TURN_PACKAGES.map(
  (p) => p.cooldownKind
);

/* ------------------------------ hero points reset ------------------------------ */

/** Diamonds to refund all allocated hero points to "unspent" (once/season). */
export const HERO_POINTS_RESET_COST = 100;

/* ------------------------------ bank interest spell ------------------------------ */

export const BANK_INTEREST_SPELL_COST = 60;
export const BANK_INTEREST_COOLDOWN_HOURS = 24;
export const BANK_INTEREST_COOLDOWN_MS = BANK_INTEREST_COOLDOWN_HOURS * 3_600_000;
