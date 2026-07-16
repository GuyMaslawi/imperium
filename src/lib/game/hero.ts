import type { Hero, HeroItem, HeroItemSlot, HeroRarity } from "@prisma/client";

/* ------------------------------ hero progression ------------------------------ */

export const HERO_MAX_LEVEL = 100;

/** Stat points granted per hero level-up (1 point = +1% to the chosen stat). */
export const POINTS_PER_LEVEL = 1;

/** Reset ("prestige") at level 100: the hero returns to level 1 with these. */
export const HERO_RESET_CITIZENS = 2500;
export const HERO_RESET_POINTS = 25;

/** Unequipped items the bag can hold. */
export const HERO_BAG_CAPACITY = 24;

/** XP needed to advance from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return 120 + (level - 1) * 35;
}

/** Battle XP: attacking is the main source; defending well also pays. */
export function attackWinXp(defenderHeroLevel: number): number {
  return 50 + defenderHeroLevel * 10;
}
export function attackLossXp(): number {
  return 15;
}
export function defenseWinXp(attackerHeroLevel: number): number {
  return 25 + attackerHeroLevel * 5;
}
export function defenseLossXp(): number {
  return 10;
}

/**
 * Apply an XP gain, cascading level-ups (each grants POINTS_PER_LEVEL).
 * XP stops accumulating at the level cap — reset the hero to keep growing.
 */
export function applyHeroXp(
  hero: Pick<Hero, "level" | "xp">,
  gain: number
): { level: number; xp: number; pointsGained: number } {
  let { level, xp } = hero;
  let pointsGained = 0;
  if (level >= HERO_MAX_LEVEL) return { level, xp: 0, pointsGained };

  xp += Math.max(0, Math.floor(gain));
  while (level < HERO_MAX_LEVEL && xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    pointsGained += POINTS_PER_LEVEL;
  }
  if (level >= HERO_MAX_LEVEL) xp = 0;
  return { level, xp, pointsGained };
}

/* ------------------------------ stats ------------------------------ */

/** Stats that hero points can be allocated to. */
export type HeroPointStat = "attack" | "defense" | "resources";

/** All stats items can boost: combat + economy (turns/diamonds/citizens are item-only). */
export type HeroStat = HeroPointStat | "turns" | "diamonds" | "citizens";

export interface HeroStatMeta {
  label: string;
  icon: string;
  tone: string;
  /** Present only on stats that accept allocated hero points. */
  pointsField?: "attackPoints" | "defensePoints" | "resourcePoints";
  description: string;
}

export const HERO_STAT_META: Record<HeroStat, HeroStatMeta> = {
  attack: {
    label: "התקפה",
    icon: "⚔️",
    tone: "text-red-400",
    pointsField: "attackPoints",
    description: "כל אחוז מגדיל את כוח הצבא שלך בתקיפה.",
  },
  defense: {
    label: "הגנה",
    icon: "🛡️",
    tone: "text-sky-300",
    pointsField: "defensePoints",
    description: "כל אחוז מגדיל את כוח הצבא שלך בהגנה מפני תקיפות.",
  },
  resources: {
    label: "משאבים",
    icon: "⛏️",
    tone: "text-emerald-400",
    pointsField: "resourcePoints",
    description: "כל אחוז מגדיל את תפוקת המכרות בכל עדכון.",
  },
  turns: {
    label: "תורות",
    icon: "⏳",
    tone: "text-amber-300",
    description: "כל אחוז מגדיל את כמות התורות המתקבלת בכל עדכון רגיל.",
  },
  diamonds: {
    label: "יהלומים",
    icon: "💎",
    tone: "text-cyan-300",
    description: "כל אחוז מגדיל את כמות היהלומים המתקבלת בכל עדכון יומי.",
  },
  citizens: {
    label: "אזרחים",
    icon: "👥",
    tone: "text-lime-300",
    description: "כל אחוז מגדיל את כמות האזרחים המצטרפת בכל עדכון יומי.",
  },
};

export const HERO_STATS = Object.keys(HERO_STAT_META) as HeroStat[];

/** The three point-allocatable stats, in display order. */
export const HERO_POINT_STATS: HeroPointStat[] = ["attack", "defense", "resources"];

/* ------------------------------ rarities ------------------------------ */

/** UI rarity key used by ItemTile (lowercase) for each DB rarity. */
export type UiRarity = "common" | "rare" | "epic" | "legendary";

export interface RarityMeta {
  label: string;
  ui: UiRarity;
  /** Item bonus % per item level. */
  multiplier: number;
  /** Relative drop weight — rarer items are harder to capture. */
  dropWeight: number;
  tone: string;
}

/** Ordered common → legendary. */
export const RARITY_ORDER: HeroRarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

export const RARITY_META: Record<HeroRarity, RarityMeta> = {
  COMMON: { label: "רגיל", ui: "common", multiplier: 0.05, dropWeight: 60, tone: "text-emerald-300" },
  RARE: { label: "נדיר", ui: "rare", multiplier: 0.1, dropWeight: 25, tone: "text-sky-300" },
  EPIC: { label: "מיוחד", ui: "epic", multiplier: 0.16, dropWeight: 11, tone: "text-purple-300" },
  LEGENDARY: { label: "אגדי", ui: "legendary", multiplier: 0.25, dropWeight: 4, tone: "text-gold-bright" },
};

/* ------------------------------ item slots ------------------------------ */

export interface SlotMeta {
  label: string;
  icon: string;
  /** Art file at /hero/<slug>.png overlays the emoji when present. */
  slug: string;
  stat: HeroStat;
  /** Economy stats have a single slot each, so those slots pack a double bonus. */
  statMultiplier: number;
}

/** Fixed 3x3 equipment layout order. */
export const SLOT_ORDER: HeroItemSlot[] = [
  "RELIC",
  "HELMET",
  "WINGS",
  "ARMOR",
  "SHIELD",
  "SWORD",
  "BOOTS",
  "PANTS",
  "GAUNTLETS",
];

/**
 * Slot → stat distribution:
 * - Combat gear splits between offense (weapons) and protection (armor).
 * - Each economy stat lives in exactly one thematic slot — the relic's magic
 *   yields resources, wings grant speed (turns), pants have deep pockets
 *   (diamonds), and boots march among the people (citizens) — so those
 *   single slots carry a double bonus.
 */
export const SLOT_META: Record<HeroItemSlot, SlotMeta> = {
  SWORD: { label: "חרב", icon: "🗡️", slug: "sword", stat: "attack", statMultiplier: 1 },
  GAUNTLETS: { label: "כפפות", icon: "🧤", slug: "gauntlet", stat: "attack", statMultiplier: 1 },
  HELMET: { label: "קסדה", icon: "🪖", slug: "helmet", stat: "defense", statMultiplier: 1 },
  ARMOR: { label: "שריון", icon: "🛡️", slug: "armor", stat: "defense", statMultiplier: 1 },
  SHIELD: { label: "מגן", icon: "🔰", slug: "buckler", stat: "defense", statMultiplier: 1 },
  RELIC: { label: "פרי שטן", icon: "😈", slug: "demon-fruit", stat: "resources", statMultiplier: 2 },
  WINGS: { label: "כנפיים", icon: "🪽", slug: "wings", stat: "turns", statMultiplier: 2 },
  PANTS: { label: "מכנסיים", icon: "👖", slug: "pants", stat: "diamonds", statMultiplier: 2 },
  BOOTS: { label: "נעליים", icon: "🥾", slug: "boots", stat: "citizens", statMultiplier: 2 },
};

/* ------------------------------ item catalog ------------------------------ */

/**
 * Items exist at these level tiers (1, 5, 10, … 100) in every slot and every
 * rarity — the full catalog is slot × tier × rarity.
 */
export const ITEM_LEVELS: number[] = [
  1,
  ...Array.from({ length: 20 }, (_, i) => (i + 1) * 5),
];

/** The % bonus a specific item grants to its slot's stat. */
export function itemBonusPct(slot: HeroItemSlot, level: number, rarity: HeroRarity): number {
  const raw = level * RARITY_META[rarity].multiplier * SLOT_META[slot].statMultiplier;
  return Math.round(raw * 10) / 10;
}

/** Equip requirement: the hero must be at least the item's level. */
export function canEquipItem(heroLevel: number, itemLevel: number): boolean {
  return heroLevel >= itemLevel;
}

/* ------------------------------ combined bonuses ------------------------------ */

export type HeroWithItems = Hero & { items: HeroItem[] };

export interface HeroBonuses {
  /** % from allocated points only. */
  points: Record<HeroStat, number>;
  /** % from equipped items only. */
  items: Record<HeroStat, number>;
  /** points + items, per stat. */
  total: Record<HeroStat, number>;
}

/** Aggregate the hero's % bonuses: allocated points + equipped items. */
export function heroBonuses(hero: HeroWithItems | null): HeroBonuses {
  // Points cover only the three allocatable stats; the rest are item-only.
  const points: Record<HeroStat, number> = {
    attack: hero?.attackPoints ?? 0,
    defense: hero?.defensePoints ?? 0,
    resources: hero?.resourcePoints ?? 0,
    turns: 0,
    diamonds: 0,
    citizens: 0,
  };
  const items: Record<HeroStat, number> = {
    attack: 0,
    defense: 0,
    resources: 0,
    turns: 0,
    diamonds: 0,
    citizens: 0,
  };
  for (const item of hero?.items ?? []) {
    if (!item.equipped) continue;
    items[SLOT_META[item.slot].stat] += itemBonusPct(item.slot, item.level, item.rarity);
  }
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const map = (fn: (stat: HeroStat) => number) =>
    Object.fromEntries(HERO_STATS.map((stat) => [stat, round1(fn(stat))])) as Record<HeroStat, number>;
  return {
    points,
    items: map((stat) => items[stat]),
    total: map((stat) => points[stat] + items[stat]),
  };
}

/** Multiplier form of a % bonus (e.g. 25 → 1.25). */
export function bonusMultiplier(pct: number): number {
  return 1 + pct / 100;
}

/* ------------------------------ item drops ------------------------------ */

/** Chance that winning an attack captures an item from the defender. */
export const ITEM_DROP_CHANCE = 0.45;

/**
 * Roll a captured item after a won attack. Rarity is weighted (rarer items
 * are much harder to capture) and the item level lands near the attacker's
 * hero level — loot you can actually use soon — snapped to a catalog tier.
 */
export function rollItemDrop(
  attackerHeroLevel: number,
  random: () => number = Math.random
): { slot: HeroItemSlot; level: number; rarity: HeroRarity } | null {
  if (random() >= ITEM_DROP_CHANCE) return null;

  // Weighted rarity roll.
  const totalWeight = RARITY_ORDER.reduce((sum, r) => sum + RARITY_META[r].dropWeight, 0);
  let roll = random() * totalWeight;
  let rarity: HeroRarity = "COMMON";
  for (const r of RARITY_ORDER) {
    roll -= RARITY_META[r].dropWeight;
    if (roll <= 0) {
      rarity = r;
      break;
    }
  }

  // Uniform slot.
  const slot = SLOT_ORDER[Math.floor(random() * SLOT_ORDER.length)];

  // Level near the attacker's hero level (±12), snapped to the nearest tier.
  const jitter = Math.round((random() * 2 - 1) * 12);
  const target = Math.min(HERO_MAX_LEVEL, Math.max(1, attackerHeroLevel + jitter));
  const level = ITEM_LEVELS.reduce((best, tier) =>
    Math.abs(tier - target) < Math.abs(best - target) ? tier : best
  );

  return { slot, level, rarity };
}

/** Display name, e.g. "חרב נדיר". */
export function itemDisplayName(slot: HeroItemSlot, rarity: HeroRarity): string {
  return `${SLOT_META[slot].label} ${RARITY_META[rarity].label}`;
}
