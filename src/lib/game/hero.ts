import type { Hero, HeroClass, HeroItem, HeroItemSlot, HeroRarity } from "@prisma/client";
import type { IconName } from "@/components/ui/Icon";
import { RESOURCE_META, type StorableResource } from "./constants";
import { secureRandom } from "./random";

/* ------------------------------ hero progression ------------------------------ */

export const HERO_MAX_LEVEL = 100;

/** Stat points granted per hero level-up (1 point = +1% to the chosen stat). */
export const POINTS_PER_LEVEL = 1;

/** Citizens the empire receives for each hero level gained. */
export const CITIZENS_PER_LEVEL = 25;

/** Reset ("prestige") at level 100: the hero returns to level 1 with these. */
export const HERO_RESET_CITIZENS = 2500;
export const HERO_RESET_POINTS = 25;

/**
 * Unequipped items the bag can hold — a 5×3 grid of slots. When it is full no
 * new item enters it: drops (attack, boss, wheel) are skipped and unequipping
 * is refused, so the count can never exceed this.
 */
export const HERO_BAG_CAPACITY = 15;

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
 * Battle XP: attacking is the main source; defending well also pays. Only
 * winning pays — a repelled attack and a breached defence both earn nothing, so
 * these two functions cover every XP-bearing outcome of a battle. The reward
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

/* ------------------------------ health, death & revival ------------------------------ */

/** A hero at full strength. Health is a plain 0–100 percentage. */
export const HERO_MAX_HEALTH = 100;

/**
 * Health lost every time an enemy attack breaches the empire's defence. Ten
 * lost defences fell the hero — and only a *won* attack wounds him, so a
 * repelled raid costs the defender nothing.
 */
export const HERO_DAMAGE_PER_LOST_DEFENSE = 10;

/** How long a fallen hero lies dead before rising by himself. */
export const HERO_REVIVE_HOURS = 1;
export const HERO_REVIVE_MS = HERO_REVIVE_HOURS * 3_600_000;

/** The two columns that decide whether the hero is alive — all these need. */
export type HeroVitals = Pick<Hero, "health" | "diedAt">;

/** A hero at zero health is dead: he grants nothing until he is raised. */
export function isHeroDead(hero: HeroVitals | null | undefined): boolean {
  return hero != null && hero.health <= 0;
}

/** Health remaining after taking a blow, floored at 0 (dead) and capped at full. */
export function damagedHealth(
  health: number,
  damage: number = HERO_DAMAGE_PER_LOST_DEFENSE
): number {
  return Math.max(0, Math.min(HERO_MAX_HEALTH, health) - Math.max(0, damage));
}

/** When a fallen hero rises on his own, or null while he still lives. */
export function heroReviveAt(hero: HeroVitals | null | undefined): Date | null {
  if (!hero || !isHeroDead(hero) || !hero.diedAt) return null;
  return new Date(hero.diedAt.getTime() + HERO_REVIVE_MS);
}

/** Whether the hour is up and the hero should be raised (lazy — see updates.ts). */
export function heroShouldRevive(
  hero: HeroVitals | null | undefined,
  now: Date
): boolean {
  const at = heroReviveAt(hero);
  return at !== null && at <= now;
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
 * grants turns/citizens gives whole units, and a resources item adds a flat
 * amount to each mined resource.
 *
 * Diamonds are deliberately absent. They are the real-money currency, and the
 * game already refuses to mint them anywhere else that scales: the season-pass
 * ladder excludes them by design, and the wheel pins its diamond wedge to a
 * `fixed` amount so it cannot grow with the economy. Gear was the one faucet
 * that broke that rule — a maxed PANTS paid 80 a day, roughly a paid package a
 * fortnight, forever. The slot now carries resources instead.
 */
export type HeroFlatStat = "resources" | "turns" | "citizens";

/** Every stat the hero surfaces: the percentage stats + the flat-count stats. */
export type HeroStat = HeroPercentStat | HeroFlatStat;

export interface HeroStatMeta {
  label: string;
  /** Shared icon-set name — resource stats wear the same glyph as everywhere. */
  icon: IconName;
  tone: string;
  /** Present only on stats that accept allocated hero points. */
  pointsField?: "attackPoints" | "defensePoints" | "resourcePoints";
  description: string;
  /** Short noun for the line under an item, e.g. "התקפה" / "תורות לעדכון יומי". */
  itemLabel: string;
}

export const HERO_STAT_META: Record<HeroStat, HeroStatMeta> = {
  attack: {
    label: "התקפה",
    itemLabel: "התקפה",
    icon: "attack",
    tone: "text-red-400",
    pointsField: "attackPoints",
    description: "כל אחוז מגדיל את כוח הצבא שלך בתקיפה.",
  },
  defense: {
    label: "הגנה",
    itemLabel: "הגנה",
    icon: "shield",
    tone: "text-sky-300",
    pointsField: "defensePoints",
    description: "כל אחוז מגדיל את כוח הצבא שלך בהגנה מפני תקיפות.",
  },
  resources: {
    label: "משאבים",
    itemLabel: "משאבים לעדכון רגיל",
    icon: "mine",
    tone: "text-emerald-400",
    pointsField: "resourcePoints",
    // Points give a %; items give flat resources (see HeroPowerSummary).
    description: "כל אחוז נקודות מגדיל את תפוקת המכרות; חפצים מוסיפים משאבים בכמות קבועה.",
  },
  spy: {
    label: "ריגול",
    itemLabel: "ריגול",
    icon: "spy",
    tone: "text-fuchsia-300",
    description: "כל אחוז מחפצים מגדיל את סיכוי הצלחת משימת הריגול שלך.",
  },
  turns: {
    label: "תורות",
    itemLabel: "תורות לעדכון יומי",
    icon: "turns",
    tone: "text-amber-300",
    // Per *daily* update, like citizens — see the turn-item note in updates.ts.
    // This string used to say "עדכון רגיל" (the 5-minute tick) and was the only
    // place in the codebase that claimed so.
    description: "חפצים מוסיפים תורות בכמות קבועה בכל עדכון יומי (לא באחוזים).",
  },
  citizens: {
    label: "אזרחים",
    itemLabel: "אזרחים לעדכון יומי",
    icon: "citizens",
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
export const HERO_FLAT_STATS: HeroFlatStat[] = ["resources", "turns", "citizens"];

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
 * Upgrade prices are **geometric in the target level**, not linear — the two
 * ends of the ladder are the anchors and every rung between them is filled in
 * by the same ratio:
 *
 *   - the first series' last step (אליט → אגדי, target level 10) costs 3M
 *   - the last series' last step (target level 100) costs 700B
 *
 * That is a factor of ~233,000 spread over 90 levels — ≈ +14.7% per level, or
 * **×3.95 per series**. So each decade of gear is worth about four times the
 * decade below it, forever, instead of the old linear curve where a level-100
 * upgrade cost only ten times a level-10 one and late-game gold had nothing to
 * buy. Prices are rounded to three significant figures so they read as prices.
 */
export const UPGRADE_COST_AT_LEVEL_10 = 3_000_000;
export const UPGRADE_COST_AT_LEVEL_100 = 700_000_000_000;

/** Per-level growth factor derived from the two anchors above (≈1.1472). */
export const UPGRADE_COST_GROWTH = Math.pow(
  UPGRADE_COST_AT_LEVEL_100 / UPGRADE_COST_AT_LEVEL_10,
  1 / 90
);

/** Round to three significant figures — 3M, 11.9M, 47M, 700B, never 46,847,113. */
function roundCost(value: number): number {
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(value)) - 2);
  return Math.round(value / magnitude) * magnitude;
}

/**
 * Gold needed to upgrade one item to the next tier level, or null when it is
 * already at the maximum level (nothing higher to upgrade to).
 */
export function itemUpgradeCost(level: number): number | null {
  const target = nextTierLevel(level);
  if (target === null) return null;
  return roundCost(
    UPGRADE_COST_AT_LEVEL_10 * UPGRADE_COST_GROWTH ** (target - 10)
  );
}

/* ------------------------------ item slots ------------------------------ */

/** One stat an item's slot grants, and how heavily it weighs it. */
export interface SlotStatWeight {
  stat: HeroStat;
  weight: number;
}

export interface SlotMeta {
  label: string;
  icon: string;
  /** Art file at /hero/<slug>.png overlays the emoji when present. */
  slug: string;
  /**
   * What this slot grants: the **primary** stat first (full weight), then the
   * secondaries (a quarter each). Never empty.
   */
  stats: readonly SlotStatWeight[];
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
 * Weight of a slot's headline stat vs. the extras riding along with it.
 *
 * Every item used to grant exactly one stat, which made gear a set of nine
 * single-purpose sliders: a sword was worth wearing or it wasn't, and there was
 * no reason to ever compare two items in different slots. Giving each slot one
 * generous stat plus a couple of smaller ones means a piece reads as a
 * character — "the sword that also drags home loot and captives" — and two
 * builds at the same hero level can differ.
 *
 * A quarter is deliberately not a token amount: at the level cap a secondary is
 * +10% attack/defense/spy, or 50 resources / 10 turns / 150 citizens. Enough to
 * shape a build, not enough to outshine the slot that actually owns the stat.
 */
export const PRIMARY_WEIGHT = 1;
export const SECONDARY_WEIGHT = 0.25;

const primary = (stat: HeroStat): SlotStatWeight => ({ stat, weight: PRIMARY_WEIGHT });
const extra = (stat: HeroStat): SlotStatWeight => ({ stat, weight: SECONDARY_WEIGHT });

/**
 * Slot → stat profile. Each line reads "primary ‖ extras".
 *
 * The thematic logic: what a piece of equipment *does* decides what it pays.
 * Blades and gauntlets strike; armour and shields hold; the visor scouts; the
 * relic conjures; wings carry you further in a day; pockets and boots are the
 * quartermaster's slots. The extras are the second-order consequence of the
 * same idea — a sword drags home loot and captives, a shield's wall buys time,
 * the relic's magic sharpens the hand and the eye that wield it.
 *
 * Every one of the six stats is the primary of at least one slot, so no build
 * can corner a stat by hoarding a single slot, and each appears as an extra
 * somewhere else so there is always more than one route to it.
 */
export const SLOT_META: Record<HeroItemSlot, SlotMeta> = {
  SWORD: {
    label: "חרב",
    icon: "🗡️",
    slug: "sword",
    stats: [primary("attack"), extra("resources"), extra("citizens")],
  },
  GAUNTLETS: {
    label: "כפפות",
    icon: "🧤",
    slug: "gauntlet",
    stats: [primary("attack"), extra("defense")],
  },
  HELMET: {
    label: "קסדה",
    icon: "🪖",
    slug: "helmet",
    stats: [primary("spy"), extra("defense"), extra("turns")],
  },
  ARMOR: {
    label: "שריון",
    icon: "🛡️",
    slug: "armor",
    stats: [primary("defense"), extra("citizens")],
  },
  SHIELD: {
    label: "מגן",
    icon: "🔰",
    slug: "buckler",
    stats: [primary("defense"), extra("resources"), extra("turns")],
  },
  RELIC: {
    label: "פרי שטן",
    icon: "😈",
    slug: "demon-fruit",
    stats: [primary("resources"), extra("attack"), extra("spy")],
  },
  WINGS: {
    label: "כנפיים",
    icon: "🪽",
    slug: "wings",
    stats: [primary("turns"), extra("spy"), extra("attack")],
  },
  PANTS: {
    // Was the diamond slot. Diamonds are the paid currency and no longer drop
    // from gear at all (see HeroFlatStat), so the pockets carry resources now.
    label: "מכנסיים",
    icon: "👖",
    slug: "pants",
    stats: [primary("resources"), extra("defense"), extra("citizens")],
  },
  BOOTS: {
    label: "נעליים",
    icon: "🥾",
    slug: "boots",
    stats: [primary("citizens"), extra("turns"), extra("resources")],
  },
};

/** The stat a slot exists for — its headline, shown on the tile. */
export function slotPrimaryStat(slot: HeroItemSlot): HeroStat {
  return SLOT_META[slot].stats[0].stat;
}

/** Whether a slot grants `stat` at all, primary or extra. */
export function slotGrants(slot: HeroItemSlot, stat: HeroStat): boolean {
  return SLOT_META[slot].stats.some((s) => s.stat === stat);
}

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
 * Percentage added per upgrade rung, at PRIMARY_WEIGHT, for the percentage
 * stats. 1%/rung → a level-100 item grants 40% in its primary stat and 10% in
 * each extra.
 */
export const PCT_PER_STEP = 1;

/**
 * Flat units granted per upgrade rung at PRIMARY_WEIGHT, for the flat-count
 * stats. Units differ wildly (a turn is not a citizen), so each scales at its
 * own rate. × 40 rungs gives the primary cap: turns 40, resources 200,
 * citizens 600 — and a quarter of each for a slot that carries it as an extra.
 *
 * These absorbed the old per-slot `statMultiplier: 2`, which existed only
 * because each flat stat used to live in exactly one slot. Now that a stat can
 * appear as a primary in one slot and an extra in another, the doubling belongs
 * to the stat, not the slot.
 */
export const FLAT_PER_STEP: Record<HeroFlatStat, number> = {
  resources: 5, // → 200 primary / 50 as an extra
  turns: 1, // → 40 primary / 10 as an extra
  // Citizens are the largest number on the board because they are the cheapest
  // unit of anything: one citizen buys one soldier, spy or mine slave. A full
  // level-100 set pays 3,150 per daily update (1,800 from BOOTS plus 450 from
  // each of SWORD/ARMOR/PANTS). There is no population ceiling, so all of it
  // lands — what bounds citizens is the update cadence, not a cap.
  citizens: 45, // → 1,800 primary / 450 as an extra
};

/**
 * Which storable resources a resource-granting item produces grows with its
 * tier: a פשוט piece conjures a single specific resource, and each tier up adds
 * another, until an אגדי piece yields all four — each at the item's full
 * resource value, not a split of it.
 */
export const RESOURCE_ITEM_COVERAGE: Record<HeroRarity, StorableResource[]> = {
  COMMON: ["gold"],
  RARE: ["gold", "wood"],
  EPIC: ["gold", "wood", "iron"],
  LEGENDARY: ["gold", "wood", "iron", "stone"],
};

/** The resources a resource-granting item of the given level produces. */
export function resourceItemResources(level: number): StorableResource[] {
  return RESOURCE_ITEM_COVERAGE[tierForLevel(level)];
}

/** The weight `slot` puts on `stat`, or 0 when it does not grant it at all. */
function slotWeight(slot: HeroItemSlot, stat: HeroStat): number {
  return SLOT_META[slot].stats.find((s) => s.stat === stat)?.weight ?? 0;
}

/**
 * The bonus an item grants in one specific stat — a pure function of slot,
 * level and stat, so every item of the same slot+level is identical. Whole
 * units (or whole percent); 0 when the slot does not carry that stat.
 *
 * The `Math.max(1, …)` floor means a stat an item genuinely grants is never
 * printed as +0. It also means an *extra* climbs in steps rather than on every
 * rung — at a quarter weight a percentage stat gains a point every four
 * upgrades. That is deliberate: the primary still moves on every single upgrade,
 * so no upgrade is ever a no-op, and rounding the extras up to keep them
 * strictly increasing would have made them as valuable as the primary.
 */
export function itemStatBonus(
  slot: HeroItemSlot,
  level: number,
  stat: HeroStat
): number {
  const weight = slotWeight(slot, stat);
  if (weight === 0) return 0;
  const perStep = statIsFlat(stat) ? FLAT_PER_STEP[stat] : PCT_PER_STEP;
  return Math.max(1, Math.round(upgradeStep(level) * perStep * weight));
}

/**
 * The item's headline number — its primary stat's value, tagged flat/percent.
 * For anywhere that shows one figure per item (catalog headers, pick lists);
 * `itemBonusLines` is what shows the whole profile.
 */
export function itemPrimaryBonus(
  slot: HeroItemSlot,
  level: number
): { stat: HeroStat; flat: boolean; value: number } {
  const stat = slotPrimaryStat(slot);
  return { stat, flat: statIsFlat(stat), value: itemStatBonus(slot, level, stat) };
}

/** One line of what an item grants, ready to render. */
export interface ItemBonusLine {
  stat: HeroStat;
  /** True for whole-unit stats, false for percentages. */
  flat: boolean;
  value: number;
  /** True for the slot's headline stat — the UI leads with it. */
  primary: boolean;
  /**
   * Set only on the resource lines an item splits into, so the tooltip can name
   * gold/wood/iron/stone individually instead of saying "משאבים" four times.
   */
  resource?: StorableResource;
  /** Display word for this line. */
  label: string;
}

/**
 * Everything an item grants, primary first — the single entry point the UI
 * renders from.
 *
 * A resource stat expands into one line per resource its tier covers, because
 * that is what the player actually receives: an אגדי relic is not "+200
 * משאבים", it is +200 of each of the four.
 */
export function itemBonusLines(
  slot: HeroItemSlot,
  level: number
): ItemBonusLine[] {
  const lines: ItemBonusLine[] = [];
  for (const { stat } of SLOT_META[slot].stats) {
    const value = itemStatBonus(slot, level, stat);
    if (value === 0) continue;
    const primary = stat === slotPrimaryStat(slot);
    if (stat === "resources") {
      for (const resource of resourceItemResources(level)) {
        lines.push({
          stat,
          flat: true,
          value,
          primary,
          resource,
          label: RESOURCE_META[resource].label,
        });
      }
      continue;
    }
    lines.push({
      stat,
      flat: statIsFlat(stat),
      value,
      primary,
      label: HERO_STAT_META[stat].itemLabel,
    });
  }
  return lines;
}

/** One resource line an item grants: its icon, its name, and the flat amount. */
export interface ItemResourceLine {
  /** Resource key — the view resolves icon + tint from the shared maps. */
  resource: StorableResource;
  label: string;
  value: number;
}

/**
 * The per-resource breakdown a resource-granting item provides — one line per
 * covered resource. Empty for items that grant no resources at all.
 */
export function itemResourceBreakdown(
  slot: HeroItemSlot,
  level: number
): ItemResourceLine[] {
  const value = itemStatBonus(slot, level, "resources");
  if (value === 0) return [];
  return resourceItemResources(level).map((r) => ({
    resource: r,
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

/* ------------------------------ hero classes ------------------------------ */

/**
 * The permanent % bonuses a class grants. attack/defense/spy stack with the
 * point and item percentages; resources multiplies mine production alongside
 * the resource points; xp scales every battle-XP gain (Shadow only).
 */
export interface HeroClassBonuses {
  attack: number;
  defense: number;
  resources: number;
  spy: number;
  xp: number;
}

export interface HeroClassMeta {
  label: string;
  /** Portrait art at /hero/classes/<slug>.jpg. */
  slug: string;
  /** rgb triple tinting the portrait's embers and halo — the class's own
   *  light, the way each boss carries its accent. */
  accent: string;
  tagline: string;
  description: string;
  bonuses: HeroClassBonuses;
}

/** Display order for pickers and galleries. */
export const HERO_CLASS_ORDER: HeroClass[] = ["WARLORD", "GUARDIAN", "MERCHANT", "SHADOW"];

export const HERO_CLASS_META: Record<HeroClass, HeroClassMeta> = {
  WARLORD: {
    label: "המצביא",
    slug: "warlord",
    accent: "214 84 62",
    tagline: "כוח הוא הטיעון היחיד",
    description: "מפקד קרבות מלידה — צבאותיו מכים חזק יותר בכל תקיפה.",
    bonuses: { attack: 10, defense: 0, resources: 0, spy: 0, xp: 0 },
  },
  GUARDIAN: {
    label: "המגן",
    slug: "guardian",
    accent: "96 156 224",
    tagline: "החומה שלא נפלה מעולם",
    description: "שומר הסף של האימפריה — הגנתו עומדת גם מול המתקפות הקשות.",
    bonuses: { attack: 0, defense: 10, resources: 0, spy: 0, xp: 0 },
  },
  MERCHANT: {
    label: "הסוחר",
    slug: "merchant",
    accent: "228 195 90",
    tagline: "כל מלחמה מתחילה באוצר",
    description: "אשף כלכלה ערמומי — המכרות שלו מפיקים יותר מכל אחד אחר.",
    bonuses: { attack: 0, defense: 0, resources: 10, spy: 0, xp: 0 },
  },
  SHADOW: {
    label: "הצל",
    slug: "shadow",
    accent: "150 96 232",
    tagline: "מה שלא רואים — מנצח",
    description: "מרגל־מתנקש הלומד מכל קרב — ריגול חד יותר וניסיון נצבר מהר.",
    bonuses: { attack: 0, defense: 0, resources: 0, spy: 15, xp: 10 },
  },
};

/** Portrait art path for a class. */
export function heroClassImage(heroClass: HeroClass): string {
  return `/hero/classes/${HERO_CLASS_META[heroClass].slug}.jpg`;
}

/** The class bonuses, zeroed for a missing hero. */
export function heroClassBonuses(heroClass: HeroClass | null | undefined): HeroClassBonuses {
  return heroClass
    ? HERO_CLASS_META[heroClass].bonuses
    : { attack: 0, defense: 0, resources: 0, spy: 0, xp: 0 };
}

/**
 * Battle-XP multiplier from the class (e.g. הצל earns +10% XP). A fallen hero
 * still learns from the battle his army fought, but his class bonus — like
 * every other bonus he brings — is switched off until he is raised.
 */
export function classXpMultiplier(
  hero: (Pick<Hero, "heroClass"> & HeroVitals) | null | undefined
): number {
  if (!hero || isHeroDead(hero)) return 1;
  return bonusMultiplier(heroClassBonuses(hero.heroClass).xp);
}

/** The non-zero bonus lines of a class, for badges/tooltips. */
export function heroClassBonusLines(
  heroClass: HeroClass
): { label: string; icon: IconName; pct: number }[] {
  const b = HERO_CLASS_META[heroClass].bonuses;
  const lines: { label: string; icon: IconName; pct: number }[] = [];
  if (b.attack) lines.push({ label: "התקפה", icon: "attack", pct: b.attack });
  if (b.defense) lines.push({ label: "הגנה", icon: "shield", pct: b.defense });
  if (b.resources) lines.push({ label: "תפוקת משאבים", icon: "mine", pct: b.resources });
  if (b.spy) lines.push({ label: "ריגול", icon: "spy", pct: b.spy });
  if (b.xp) lines.push({ label: "ניסיון גיבור", icon: "spark", pct: b.xp });
  return lines;
}

/* ------------------------------ combined bonuses ------------------------------ */

export type HeroWithItems = Hero & { items: HeroItem[] };

export interface HeroBonuses {
  /** % from allocated points only (attack/defense/resources). */
  points: Record<HeroPointStat, number>;
  /** % from equipped items, for the percentage stats (attack/defense/spy). */
  itemsPct: Record<HeroPercentStat, number>;
  /** Flat unit counts from equipped items (resources/turns/citizens). */
  itemsFlat: Record<HeroFlatStat, number>;
  /**
   * Flat resource units from equipped resource-items, split across the specific
   * resources each item covers (a specialised relic feeds one; an אגדי relic
   * feeds all four). This — not `itemsFlat.resources` — drives production.
   */
  itemsFlatByResource: Record<StorableResource, number>;
  /**
   * The permanent % the chosen class contributes (zero for a missing hero).
   * attack/defense/spy are already folded into `totalPct`; resources must be
   * added wherever `points.resources` multiplies production.
   */
  classPct: { attack: number; defense: number; resources: number; spy: number };
  /**
   * Combined percentage per percentage stat = allocated points + item % +
   * class %. (spy has no point allocation, so its total is items + class.)
   * These drive battle/spy power; the flat item counts drive production
   * directly.
   */
  totalPct: Record<HeroPercentStat, number>;
}

/** Every bonus at zero — what a fallen hero contributes, and a missing one. */
export function zeroHeroBonuses(): HeroBonuses {
  return {
    points: { attack: 0, defense: 0, resources: 0 },
    itemsPct: { attack: 0, defense: 0, spy: 0 },
    itemsFlat: { resources: 0, turns: 0, citizens: 0 },
    itemsFlatByResource: { gold: 0, wood: 0, iron: 0, stone: 0 },
    classPct: { attack: 0, defense: 0, resources: 0, spy: 0 },
    totalPct: { attack: 0, defense: 0, spy: 0 },
  };
}

/**
 * The bonuses the hero is **actually** contributing right now. A dead hero
 * (health 0) carries none of them — not his allocated points, not his gear,
 * not his class bonus — until he rises, an hour after he fell or the moment
 * his owner pays the diamonds. Every gameplay site (battle, spy, production,
 * boss, the power cards) reads this, so death is felt everywhere at once.
 *
 * The character sheet wants the numbers the hero *would* grant — it uses
 * `rawHeroBonuses` and says plainly that death has switched them off.
 */
export function heroBonuses(hero: HeroWithItems | null): HeroBonuses {
  return isHeroDead(hero) ? zeroHeroBonuses() : rawHeroBonuses(hero);
}

/**
 * Aggregate the hero's bonuses, ignoring whether he is alive. Percentage stats
 * (attack/defense/spy) combine allocated points with item %; flat stats
 * (resources/turns/citizens) come from equipped items only, as whole unit
 * counts. Every value is an integer, so no rounding is needed here.
 *
 * Each equipped item contributes through *every* stat its slot carries — its
 * primary and its extras alike — so a build is the sum of nine profiles rather
 * than nine independent sliders.
 */
export function rawHeroBonuses(hero: HeroWithItems | null): HeroBonuses {
  const points: Record<HeroPointStat, number> = {
    attack: hero?.attackPoints ?? 0,
    defense: hero?.defensePoints ?? 0,
    resources: hero?.resourcePoints ?? 0,
  };
  const itemsPct: Record<HeroPercentStat, number> = { attack: 0, defense: 0, spy: 0 };
  const itemsFlat: Record<HeroFlatStat, number> = {
    resources: 0,
    turns: 0,
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
    for (const { stat } of SLOT_META[item.slot].stats) {
      const value = itemStatBonus(item.slot, item.level, stat);
      if (value === 0) continue;
      if (statIsFlat(stat)) {
        itemsFlat[stat] += value;
        // A resource bonus feeds only the resources the item's tier covers —
        // each at the full amount, which is what makes an אגדי piece worth four
        // times a פשוט one beyond the raw number.
        if (stat === "resources") {
          for (const r of resourceItemResources(item.level)) {
            itemsFlatByResource[r] += value;
          }
        }
      } else itemsPct[stat] += value;
    }
  }
  const cls = heroClassBonuses(hero?.heroClass);
  const classPct = {
    attack: cls.attack,
    defense: cls.defense,
    resources: cls.resources,
    spy: cls.spy,
  };
  const totalPct: Record<HeroPercentStat, number> = {
    // Wearing items no longer changes the point cards, but the *combined* hero
    // power (shown in the summary and used in battle) adds points, items and
    // the class bonus together.
    attack: points.attack + itemsPct.attack + classPct.attack,
    defense: points.defense + itemsPct.defense + classPct.defense,
    spy: itemsPct.spy + classPct.spy,
  };
  return { points, itemsPct, itemsFlat, itemsFlatByResource, classPct, totalPct };
}

/** Multiplier form of a % bonus (e.g. 25 → 1.25). */
export function bonusMultiplier(pct: number): number {
  return 1 + pct / 100;
}

/* ------------------------------ item drops ------------------------------ */

/**
 * Chance that winning an attack captures an item **of each rarity**.
 *
 * Rarity drives frequency directly, rather than falling out of a uniform level
 * roll. Gear is meant to be earned: fewer than one in five winning attacks
 * yields anything at all, and the top of the ladder stays rare — an אגדי is a
 * flat 0.5% of winning attacks, an אליט 1.5%.
 *
 * These are per-winning-attack probabilities and are mutually exclusive; the
 * remainder (1 − ITEM_DROP_CHANCE) is no drop at all.
 */
export const ITEM_DROP_CHANCE_BY_RARITY: Record<HeroRarity, number> = {
  COMMON: 0.12, // פשוט — 12%
  RARE: 0.05, // מתקדם — 5%
  EPIC: 0.015, // אליט — 1.5%
  LEGENDARY: 0.005, // אגדי — 0.5%
};

/** Chance a won attack yields any item at all — the sum of the table above. */
export const ITEM_DROP_CHANCE = RARITY_ORDER.reduce(
  (sum, r) => sum + ITEM_DROP_CHANCE_BY_RARITY[r],
  0
);

/** The level at which each tier band opens inside a decade. */
const RARITY_BAND_OFFSET: Record<HeroRarity, number> = {
  COMMON: 1,
  RARE: 3,
  EPIC: 8,
  LEGENDARY: 10,
};

/**
 * A concrete level for a dropped item of the given rarity, in a decade near the
 * hero's own so the loot is roughly wearable. Drops land exactly on a band-start
 * level (an UPGRADE_LEVELS rung), which is what makes the rolled rarity and
 * `tierForLevel` agree by construction.
 */
export function itemLevelForRarity(
  heroLevel: number,
  rarity: HeroRarity,
  random: () => number = secureRandom
): number {
  const decades = HERO_MAX_LEVEL / 10;
  const heroDecade = Math.floor((Math.max(1, heroLevel) - 1) / 10);
  const jitter = Math.floor(random() * 3) - 1; // one decade either side
  const decade = Math.min(decades - 1, Math.max(0, heroDecade + jitter));
  return Math.min(HERO_MAX_LEVEL, decade * 10 + RARITY_BAND_OFFSET[rarity]);
}

function itemOfRarity(
  attackerHeroLevel: number,
  rarity: HeroRarity,
  random: () => number
): { slot: HeroItemSlot; level: number; rarity: HeroRarity } {
  const slot = SLOT_ORDER[Math.floor(random() * SLOT_ORDER.length)];
  const level = itemLevelForRarity(attackerHeroLevel, rarity, random);
  return { slot, level, rarity };
}

/**
 * Roll a captured item after a won attack, or null for no drop. One roll walks
 * the cumulative rarity table, so the odds are exactly ITEM_DROP_CHANCE_BY_RARITY.
 */
export function rollItemDrop(
  attackerHeroLevel: number,
  random: () => number = secureRandom
): { slot: HeroItemSlot; level: number; rarity: HeroRarity } | null {
  const roll = random();
  let acc = 0;
  for (const rarity of RARITY_ORDER) {
    acc += ITEM_DROP_CHANCE_BY_RARITY[rarity];
    if (roll < acc) return itemOfRarity(attackerHeroLevel, rarity, random);
  }
  return null;
}

/**
 * Roll an item that is guaranteed to drop, keeping the *relative* rarity odds
 * intact — the wheel's "חפץ" wedge already decided that something is won, so
 * only the rarity split matters. Renormalising beats forcing the drop roll to
 * zero, which would always hand out the most common tier.
 */
export function rollGuaranteedItem(
  attackerHeroLevel: number,
  random: () => number = secureRandom
): { slot: HeroItemSlot; level: number; rarity: HeroRarity } {
  const roll = random() * ITEM_DROP_CHANCE;
  let acc = 0;
  for (const rarity of RARITY_ORDER) {
    acc += ITEM_DROP_CHANCE_BY_RARITY[rarity];
    if (roll < acc) return itemOfRarity(attackerHeroLevel, rarity, random);
  }
  return itemOfRarity(attackerHeroLevel, "COMMON", random);
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
 * `bonus` is the empire's wheel-luck upgrade bonus (a fraction, e.g. 0.1 = +10%)
 * added on top of the item's rarity-based chance. The server owns this roll,
 * exactly like item drops.
 */
export function rollDiscardWheelSpin(
  level: number,
  bonus = 0,
  random: () => number = secureRandom
): boolean {
  return random() < discardWheelSpinChance(level) + bonus;
}
