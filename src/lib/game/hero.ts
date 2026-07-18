import type { Hero, HeroItem, HeroItemSlot, HeroRarity } from "@prisma/client";
import { RESOURCE_META, type StorableResource } from "./constants";

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

/** Stats that hero points can be allocated to (each point = +1%). */
export type HeroPointStat = "attack" | "defense" | "resources";

/**
 * Stats whose item bonus is a **percentage** (multiplies the relevant power).
 * attack/defense stack on top of allocated points; spy is item-only.
 */
export type HeroPercentStat = "attack" | "defense" | "spy";

/**
 * Stats whose item bonus is a **flat count**, not a percentage — an item that
 * grants turns/diamonds/citizens gives whole units, and a resources item adds
 * a flat amount to each mined resource.
 */
export type HeroFlatStat = "resources" | "turns" | "diamonds" | "citizens";

/** Every stat the hero surfaces: the percentage stats + the flat-count stats. */
export type HeroStat = HeroPercentStat | HeroFlatStat;

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
    // Points give a %; items give flat resources (see HeroPowerSummary).
    description: "כל אחוז נקודות מגדיל את תפוקת המכרות; חפצים מוסיפים משאבים בכמות קבועה.",
  },
  spy: {
    label: "ריגול",
    icon: "🕵️",
    tone: "text-fuchsia-300",
    description: "כל אחוז מחפצים מגדיל את סיכוי הצלחת משימת הריגול שלך.",
  },
  turns: {
    label: "תורות",
    icon: "⏳",
    tone: "text-amber-300",
    description: "חפצים מוסיפים תורות בכמות קבועה בכל עדכון רגיל (לא באחוזים).",
  },
  diamonds: {
    label: "יהלומים",
    icon: "💎",
    tone: "text-cyan-300",
    description: "חפצים מוסיפים יהלומים בכמות קבועה בכל עדכון יומי (לא באחוזים).",
  },
  citizens: {
    label: "אזרחים",
    icon: "👥",
    tone: "text-lime-300",
    description: "חפצים מוסיפים אזרחים בכמות קבועה בכל עדכון יומי (לא באחוזים).",
  },
};

export const HERO_STATS = Object.keys(HERO_STAT_META) as HeroStat[];

/** The three point-allocatable stats, in display order. */
export const HERO_POINT_STATS: HeroPointStat[] = ["attack", "defense", "resources"];

/** Stats whose item bonus is a percentage (attack/defense stack with points). */
export const HERO_PERCENT_STATS: HeroPercentStat[] = ["attack", "defense", "spy"];

/** Stats whose item bonus is a flat count of whole units. */
export const HERO_FLAT_STATS: HeroFlatStat[] = ["resources", "turns", "diamonds", "citizens"];

/** Whether a stat's item bonus is a flat count (true) or a percentage (false). */
export function statIsFlat(stat: HeroStat): stat is HeroFlatStat {
  return (HERO_FLAT_STATS as HeroStat[]).includes(stat);
}

/* ------------------------------ tiers (derived from level) ------------------------------ */

/**
 * An item's tier (its "rarity") is derived purely from its level — two items
 * of the same slot and level are always identical. The named series repeats
 * every 10 levels: within each decade, offsets 1-2 are פשוט, 3-7 מתקדם,
 * 8-9 אליט, 10 אגדי; then the pattern begins again one decade higher.
 */

/** UI rarity key used by ItemTile (lowercase) for each tier. */
export type UiRarity = "common" | "rare" | "epic" | "legendary";

export interface RarityMeta {
  label: string;
  ui: UiRarity;
  tone: string;
}

/** Ordered lowest → highest tier within a series. */
export const RARITY_ORDER: HeroRarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

export const RARITY_META: Record<HeroRarity, RarityMeta> = {
  COMMON: { label: "פשוט", ui: "common", tone: "text-emerald-300" },
  RARE: { label: "מתקדם", ui: "rare", tone: "text-sky-300" },
  EPIC: { label: "אליט", ui: "epic", tone: "text-purple-300" },
  LEGENDARY: { label: "אגדי", ui: "legendary", tone: "text-gold-bright" },
};

/** The tier an item of the given level belongs to (repeats every 10 levels). */
export function tierForLevel(level: number): HeroRarity {
  const offset = ((Math.max(1, level) - 1) % 10) + 1; // 1..10 within the decade
  if (offset <= 2) return "COMMON";
  if (offset <= 7) return "RARE";
  if (offset <= 9) return "EPIC";
  return "LEGENDARY";
}

/* ------------------------------ item upgrades ------------------------------ */

/**
 * The level where each tier band begins, within a decade: פשוט at +1,
 * מתקדם at +3, אליט at +8, אגדי at +10. Upgrading an item jumps its level to
 * the next of these — i.e. up to the start of the next tier.
 */
const BAND_START_OFFSETS = [1, 3, 8, 10];

/** Every level an item can be upgraded *to*, ascending: 1,3,8,10,11,13,…,100. */
export const UPGRADE_LEVELS: number[] = Array.from(
  { length: HERO_MAX_LEVEL / 10 },
  (_, decade) => decade * 10
).flatMap((base) => BAND_START_OFFSETS.map((o) => base + o));

/** The level an item reaches when upgraded, or null if already maxed (100). */
export function nextTierLevel(level: number): number | null {
  for (const v of UPGRADE_LEVELS) if (v > level) return v;
  return null;
}

/** Gold per target level — a higher-level upgrade costs proportionally more. */
export const UPGRADE_GOLD_PER_LEVEL = 120;

/**
 * Gold needed to upgrade one item to the next tier level, or null when it is
 * already at the maximum level (nothing higher to upgrade to).
 */
export function itemUpgradeCost(level: number): number | null {
  const target = nextTierLevel(level);
  if (target === null) return null;
  return Math.round(target * UPGRADE_GOLD_PER_LEVEL);
}

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
 * - Offense (swords/gauntlets) and protection (armor/shield) give percentages.
 * - The helmet's visor scouts the field — it grants the spy percentage.
 * - Each flat-count stat lives in exactly one thematic slot — the relic's magic
 *   conjures resources, wings grant speed (turns), pants have deep pockets
 *   (diamonds), and boots march among the people (citizens) — so those
 *   single slots carry a double bonus.
 */
export const SLOT_META: Record<HeroItemSlot, SlotMeta> = {
  SWORD: { label: "חרב", icon: "🗡️", slug: "sword", stat: "attack", statMultiplier: 1 },
  GAUNTLETS: { label: "כפפות", icon: "🧤", slug: "gauntlet", stat: "attack", statMultiplier: 1 },
  HELMET: { label: "קסדה", icon: "🪖", slug: "helmet", stat: "spy", statMultiplier: 1 },
  ARMOR: { label: "שריון", icon: "🛡️", slug: "armor", stat: "defense", statMultiplier: 1 },
  SHIELD: { label: "מגן", icon: "🔰", slug: "buckler", stat: "defense", statMultiplier: 1 },
  RELIC: { label: "פרי שטן", icon: "😈", slug: "demon-fruit", stat: "resources", statMultiplier: 2 },
  WINGS: { label: "כנפיים", icon: "🪽", slug: "wings", stat: "turns", statMultiplier: 2 },
  PANTS: { label: "מכנסיים", icon: "👖", slug: "pants", stat: "diamonds", statMultiplier: 2 },
  BOOTS: { label: "נעליים", icon: "🥾", slug: "boots", stat: "citizens", statMultiplier: 2 },
};

/* ------------------------------ item catalog ------------------------------ */

/**
 * The catalog shows one representative item per tier-band start level, per
 * slot — 1,3,8,10,11,… (the same levels an item can be upgraded to).
 */
export const ITEM_LEVELS: number[] = UPGRADE_LEVELS;

/** Bonus % per item level (before the slot's multiplier), for percentage stats. */
export const BONUS_PER_LEVEL = 0.25;

/**
 * Flat units granted per item level (before the slot's multiplier), for the
 * flat-count stats. Units differ wildly (a turn is not a citizen), so each
 * flat stat scales at its own rate. Tune these to taste — they are the item
 * side of the economy.
 */
export const FLAT_PER_LEVEL: Record<HeroFlatStat, number> = {
  resources: 1, // added to each resource the item covers, per regular tick
  turns: 0.2, // extra turns per regular tick
  diamonds: 0.15, // extra diamonds per daily update
  citizens: 3, // extra citizens per daily update
};

/**
 * Which storable resources a resource-item (the relic slot) produces grows
 * with its tier: a פשוט relic conjures a single specific resource, and each
 * tier up adds another, until an אגדי relic yields all four. So some resource
 * items bring several resources and some only a specific one — by their tier.
 */
export const RESOURCE_ITEM_COVERAGE: Record<HeroRarity, StorableResource[]> = {
  COMMON: ["gold"],
  RARE: ["gold", "wood"],
  EPIC: ["gold", "wood", "iron"],
  LEGENDARY: ["gold", "wood", "iron", "stone"],
};

/** The resources a resource-item of the given level produces (by its tier). */
export function resourceItemResources(level: number): StorableResource[] {
  return RESOURCE_ITEM_COVERAGE[tierForLevel(level)];
}

/**
 * The % bonus an item grants to its (percentage) slot's stat — a pure function
 * of slot and level, so every item of the same slot+level is identical. Always
 * a whole %. Meaningful only for HERO_PERCENT_STATS slots.
 */
export function itemBonusPct(slot: HeroItemSlot, level: number): number {
  const raw = level * BONUS_PER_LEVEL * SLOT_META[slot].statMultiplier;
  // Percentages are always whole numbers; every real item is worth at least 1%.
  return Math.max(1, Math.round(raw));
}

/**
 * The flat unit bonus an item grants to its (flat) slot's stat — whole units,
 * at least 1. Meaningful only for HERO_FLAT_STATS slots.
 */
export function itemBonusFlat(slot: HeroItemSlot, level: number): number {
  const stat = SLOT_META[slot].stat;
  const perLevel = statIsFlat(stat) ? FLAT_PER_LEVEL[stat] : 0;
  const raw = level * perLevel * SLOT_META[slot].statMultiplier;
  return Math.max(1, Math.round(raw));
}

/**
 * The bonus an item grants, tagged with whether it is a flat count or a %.
 * The single entry point the UI should use to render an item's value.
 */
export function itemBonusValue(
  slot: HeroItemSlot,
  level: number
): { flat: boolean; value: number } {
  const flat = statIsFlat(SLOT_META[slot].stat);
  return { flat, value: flat ? itemBonusFlat(slot, level) : itemBonusPct(slot, level) };
}

/** One resource line an item grants: its icon, its name, and the flat amount. */
export interface ItemResourceLine {
  icon: string;
  label: string;
  value: number;
}

/**
 * The per-resource breakdown a resource-item grants — one line per covered
 * resource, each with its icon, its word, and its flat amount (e.g.
 * "⚙️ ברזל 20"). Empty for non-resource items (which show a single stat line).
 */
export function itemResourceBreakdown(
  slot: HeroItemSlot,
  level: number
): ItemResourceLine[] {
  if (SLOT_META[slot].stat !== "resources") return [];
  const value = itemBonusFlat(slot, level);
  return resourceItemResources(level).map((r) => ({
    icon: RESOURCE_META[r].icon,
    label: RESOURCE_META[r].label,
    value,
  }));
}

/** Equip requirement: the hero must be at least the item's level. */
export function canEquipItem(heroLevel: number, itemLevel: number): boolean {
  return heroLevel >= itemLevel;
}

/* ------------------------------ combined bonuses ------------------------------ */

export type HeroWithItems = Hero & { items: HeroItem[] };

export interface HeroBonuses {
  /** % from allocated points only (attack/defense/resources). */
  points: Record<HeroPointStat, number>;
  /** % from equipped items, for the percentage stats (attack/defense/spy). */
  itemsPct: Record<HeroPercentStat, number>;
  /** Flat unit counts from equipped items (resources/turns/diamonds/citizens). */
  itemsFlat: Record<HeroFlatStat, number>;
  /**
   * Flat resource units from equipped resource-items, split across the specific
   * resources each item covers (a specialised relic feeds one; an אגדי relic
   * feeds all four). This — not `itemsFlat.resources` — drives production.
   */
  itemsFlatByResource: Record<StorableResource, number>;
  /**
   * Combined percentage per percentage stat = allocated points + item %.
   * (spy has no point allocation, so its total is item-only.) These drive
   * battle/spy power; the flat item counts drive production directly.
   */
  totalPct: Record<HeroPercentStat, number>;
}

/**
 * Aggregate the hero's bonuses. Percentage stats (attack/defense/spy) combine
 * allocated points with item %; flat stats (resources/turns/diamonds/citizens)
 * come from equipped items only, as whole unit counts. Every value is an
 * integer, so no rounding is needed here.
 */
export function heroBonuses(hero: HeroWithItems | null): HeroBonuses {
  const points: Record<HeroPointStat, number> = {
    attack: hero?.attackPoints ?? 0,
    defense: hero?.defensePoints ?? 0,
    resources: hero?.resourcePoints ?? 0,
  };
  const itemsPct: Record<HeroPercentStat, number> = { attack: 0, defense: 0, spy: 0 };
  const itemsFlat: Record<HeroFlatStat, number> = {
    resources: 0,
    turns: 0,
    diamonds: 0,
    citizens: 0,
  };
  const itemsFlatByResource: Record<StorableResource, number> = {
    gold: 0,
    wood: 0,
    iron: 0,
    stone: 0,
  };
  for (const item of hero?.items ?? []) {
    if (!item.equipped) continue;
    const stat = SLOT_META[item.slot].stat;
    if (statIsFlat(stat)) {
      const flat = itemBonusFlat(item.slot, item.level);
      itemsFlat[stat] += flat;
      // A resource item feeds only the specific resources its tier covers.
      if (stat === "resources") {
        for (const r of resourceItemResources(item.level)) itemsFlatByResource[r] += flat;
      }
    } else itemsPct[stat] += itemBonusPct(item.slot, item.level);
  }
  const totalPct: Record<HeroPercentStat, number> = {
    // Wearing items no longer changes the point cards, but the *combined* hero
    // power (shown in the summary and used in battle) does add both together.
    attack: points.attack + itemsPct.attack,
    defense: points.defense + itemsPct.defense,
    spy: itemsPct.spy,
  };
  return { points, itemsPct, itemsFlat, itemsFlatByResource, totalPct };
}

/** Multiplier form of a % bonus (e.g. 25 → 1.25). */
export function bonusMultiplier(pct: number): number {
  return 1 + pct / 100;
}

/* ------------------------------ item drops ------------------------------ */

/** Chance that winning an attack captures an item from the defender. */
export const ITEM_DROP_CHANCE = 0.45;

/**
 * Roll a captured item after a won attack. The item level lands near the
 * attacker's hero level (±12) — loot you can actually use soon — and its tier
 * follows from that level. Rarer tiers are naturally scarcer because fewer
 * levels map to them (only 1 in 10 is legendary).
 */
export function rollItemDrop(
  attackerHeroLevel: number,
  random: () => number = Math.random
): { slot: HeroItemSlot; level: number; rarity: HeroRarity } | null {
  if (random() >= ITEM_DROP_CHANCE) return null;

  // Uniform slot.
  const slot = SLOT_ORDER[Math.floor(random() * SLOT_ORDER.length)];

  // Level near the attacker's hero level (±12); the tier is derived from it.
  const jitter = Math.round((random() * 2 - 1) * 12);
  const level = Math.min(HERO_MAX_LEVEL, Math.max(1, attackerHeroLevel + jitter));

  return { slot, level, rarity: tierForLevel(level) };
}

/** Display name, e.g. "חרב מתקדם" — the tier follows from the item's level. */
export function itemDisplayName(slot: HeroItemSlot, level: number): string {
  return `${SLOT_META[slot].label} ${RARITY_META[tierForLevel(level)].label}`;
}
