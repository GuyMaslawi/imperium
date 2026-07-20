import type { Hero, HeroItem, HeroItemSlot, HeroRarity } from "@prisma/client";
import { RESOURCE_META, type StorableResource } from "./constants";

/* ------------------------------ hero progression ------------------------------ */

export const HERO_MAX_LEVEL = 100;

/** Stat points granted per hero level-up (1 point = +1% to the chosen stat). */
export const POINTS_PER_LEVEL = 1;

/** Citizens the empire receives for each hero level gained. */
export const CITIZENS_PER_LEVEL = 25;

/** Reset ("prestige") at level 100: the hero returns to level 1 with these. */
export const HERO_RESET_CITIZENS = 2500;
export const HERO_RESET_POINTS = 25;

/** Unequipped items the bag can hold. */
export const HERO_BAG_CAPACITY = 24;

/** XP needed to advance from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return 120 + (level - 1) * 35;
}

/**
 * Extra XP multiplier from an opponent's prestige: every reset marks a foe who
 * has already climbed the full level curve at least once, so beating (or
 * repelling) them is worth more. +25% per reset, so a fresh hero adds nothing.
 */
export const XP_PER_RESET_BONUS = 0.25;
export function resetXpMultiplier(resets: number): number {
  return 1 + Math.max(0, resets) * XP_PER_RESET_BONUS;
}

/**
 * How real the fight was, as a reward factor. `foePower / ownPower` is ~0 when
 * you crush someone far weaker and approaches 1 for an even match (on a win the
 * ratio is always < 1, since the winner had the greater power). We map it to a
 * 0.3x–2x band so a stomp still pays a small floor while a nail-biter — or an
 * upset against a stronger foe — pays full and then some. This is what makes
 * the gain sensible relative to *who you picked*, and dynamic on every attack:
 * as both armies change, so does the ratio, so no two attacks pay the same.
 */
export const MIN_MATCHUP_XP_FACTOR = 0.3;
export const MAX_MATCHUP_XP_FACTOR = 2;
export function matchupXpFactor(ownPower: number, foePower: number): number {
  const ratio = ownPower > 0 ? foePower / ownPower : 0;
  return Math.min(MAX_MATCHUP_XP_FACTOR, Math.max(MIN_MATCHUP_XP_FACTOR, 0.3 + ratio * 1.4));
}

/**
 * Battle XP: attacking is the main source; defending well also pays. The reward
 * scales with three things — the opponent hero's level (a higher target is
 * inherently worth more), how many times they have prestiged (+25% per reset),
 * and the power matchup (see `matchupXpFactor`). Because the matchup factor
 * folds in *your* strength relative to the target, a strong hero stomping the
 * weak no longer earns the same flat XP every time; you are paid for the fight
 * you actually picked.
 */
export function attackWinXp(
  defenderHeroLevel: number,
  defenderResets: number,
  attackerPower: number,
  defenderPower: number
): number {
  const base = 40 + defenderHeroLevel * 10;
  return Math.round(
    base * matchupXpFactor(attackerPower, defenderPower) * resetXpMultiplier(defenderResets)
  );
}
export function attackLossXp(): number {
  return 15;
}
export function defenseWinXp(
  attackerHeroLevel: number,
  attackerResets: number,
  defenderPower: number,
  attackerPower: number
): number {
  const base = 20 + attackerHeroLevel * 5;
  return Math.round(
    base * matchupXpFactor(defenderPower, attackerPower) * resetXpMultiplier(attackerResets)
  );
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

/**
 * An item's rung on the upgrade ladder: how many upgrade levels it has reached
 * (1..40). This — not the raw level — drives the bonus, because every upgrade
 * advances the item by exactly one rung, so bonuses keyed to the rung are
 * *guaranteed* to strictly increase on each upgrade (never the +17 → +17 that a
 * rounded level-based bonus produced when a rate fell below 1/level). A dropped
 * item at any level shares the rung of the last upgrade level it has passed, so
 * two items in the same tier band (e.g. levels 41 and 42) read identically.
 */
export function upgradeStep(level: number): number {
  let k = 0;
  for (const v of UPGRADE_LEVELS) {
    if (v <= level) k += 1;
    else break;
  }
  return Math.max(1, k);
}

/**
 * Gold per target level. Anchored so the early upgrades (the first tier band,
 * target levels 1→10) cost between 100k and 1M gold, then keep climbing
 * linearly with the target level: 100k at level 1, 1M at level 10, 10M at the
 * cap (level 100). A higher-level upgrade costs proportionally more.
 */
export const UPGRADE_GOLD_PER_LEVEL = 100_000;

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

/**
 * Bonuses scale with the item's upgrade *rung* (see `upgradeStep`), not its raw
 * level, so every upgrade adds a whole, strictly-larger amount — an upgrade can
 * never leave the bonus unchanged. There are 40 rungs (levels 1→100), so each
 * stat's per-rung increment × 40 is its bonus at the cap.
 */

/**
 * Percentage added per upgrade rung (before the slot's multiplier), for the
 * percentage stats. 1%/rung → a level-100 combat item grants 40% (up from the
 * old ~25%), so every one of the 40 upgrades is a visible +1%.
 */
export const PCT_PER_STEP = 1;

/**
 * Flat units granted per upgrade rung (before the slot's ×2), for the flat-count
 * stats. Units differ wildly (a turn is not a citizen), so each scales at its
 * own rate; every value clears 1/rung *after* the ×2, so no upgrade is a no-op.
 * ×2 × 40 rungs gives the cap: turns 40, diamonds 40, resources 200, citizens 600.
 */
export const FLAT_PER_STEP: Record<HeroFlatStat, number> = {
  resources: 2.5, // ×2 = +5 per rung → 200 at the cap
  turns: 0.5, // ×2 = +1 per rung → 40 at the cap
  diamonds: 0.5, // ×2 = +1 per rung → 40 at the cap
  citizens: 7.5, // ×2 = +15 per rung → 600 at the cap
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
  const raw = upgradeStep(level) * PCT_PER_STEP * SLOT_META[slot].statMultiplier;
  // Percentages are always whole numbers; every real item is worth at least 1%.
  return Math.max(1, Math.round(raw));
}

/**
 * The flat unit bonus an item grants to its (flat) slot's stat — whole units,
 * at least 1. Meaningful only for HERO_FLAT_STATS slots.
 */
export function itemBonusFlat(slot: HeroItemSlot, level: number): number {
  const stat = SLOT_META[slot].stat;
  const perStep = statIsFlat(stat) ? FLAT_PER_STEP[stat] : 0;
  const raw = upgradeStep(level) * perStep * SLOT_META[slot].statMultiplier;
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

/**
 * Upgrade requirement: the level the item would *reach* must not exceed the
 * hero's own level — you can't push gear above your hero. Returns false when the
 * item is already maxed (nothing higher to upgrade to).
 */
export function canUpgradeItem(heroLevel: number, itemLevel: number): boolean {
  const target = nextTierLevel(itemLevel);
  return target !== null && heroLevel >= target;
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

/* ------------------------------ discard → wheel spin ------------------------------ */

/**
 * Throwing an item away can reward a wheel-of-fortune spin — the fates smile on
 * those who part with their gear. The chance climbs sharply with the item's
 * tier, so junk almost never pays while an אגדי pays a full 1-in-10.
 */
export const DISCARD_WHEEL_SPIN_CHANCE: Record<HeroRarity, number> = {
  COMMON: 0.01, // פשוט — 1%
  RARE: 0.03, // מתקדם — 3%
  EPIC: 0.06, // אליט — 6%
  LEGENDARY: 0.1, // אגדי — 10%
};

/** The wheel-spin drop chance for an item of the given level (by its tier). */
export function discardWheelSpinChance(level: number): number {
  return DISCARD_WHEEL_SPIN_CHANCE[tierForLevel(level)];
}

/**
 * Roll whether throwing away an item of the given level grants a wheel spin.
 * The server owns this roll, exactly like item drops.
 */
export function rollDiscardWheelSpin(
  level: number,
  random: () => number = Math.random
): boolean {
  return random() < discardWheelSpinChance(level);
}
