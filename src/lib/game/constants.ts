import type {
  BuildingType,
  EmpireUpgradeType,
  ResourceStorageType,
} from "@prisma/client";
import type { IconName } from "@/components/ui/Icon";

/**
 * The words for each balance. Deliberately icon-free: a resource's glyph and
 * tint live in `RESOURCE_ICON` / `RESOURCE_ICON_COLOR` (components/ui/Icon), so
 * there is exactly one place that decides what a resource looks like.
 */
export const RESOURCE_META = {
  gold: { label: "זהב" },
  wood: { label: "עץ" },
  iron: { label: "ברזל" },
  stone: { label: "אבן" },
  diamonds: { label: "יהלומים" },
  citizens: { label: "אזרחים" },
  turns: { label: "תורות" },
} as const;

export type ResourceKey = keyof typeof RESOURCE_META;

/** The four storable resources — each has a dedicated warehouse. */
export type StorableResource = "gold" | "wood" | "iron" | "stone";

/* ------------------------------ update cadence ------------------------------ */

export const GAME_TIMEZONE = "Asia/Jerusalem";

/** Regular production tick length, in minutes. */
export const REGULAR_TICK_MINUTES = 5;
export const REGULAR_TICK_MS = REGULAR_TICK_MINUTES * 60 * 1000;

/**
 * Regular ticks in a day. Anything a tick grants is worth this much per day, so
 * it is the figure that makes a per-tick reward legible — both to a player
 * reading the turns upgrade and to the monitor's turn-burn ceiling.
 */
export const TICKS_PER_DAY = 86_400_000 / REGULAR_TICK_MS;

/** Daily update wall times (Asia/Jerusalem). */
export const DAILY_UPDATE_TIMES: ReadonlyArray<{ hour: number; minute: number }> = [
  { hour: 7, minute: 30 },
  { hour: 19, minute: 30 },
];

/* ------------------------------ buildings ------------------------------ */

export interface BuildingMeta {
  label: string;
  icon: IconName;
  description: string;
  producedResource: StorableResource | null;
  supportsSlaves: boolean;
}

export const BUILDING_META: Record<BuildingType, BuildingMeta> = {
  GOLD_MINE: {
    label: "מכרה זהב",
    icon: "gold",
    description: "כורה זהב מהאדמה. ככל שרמת המכרה גבוהה יותר ויש יותר עבדי מכרות — התפוקה עולה.",
    producedResource: "gold",
    supportsSlaves: true,
  },
  WOOD_CAMP: {
    label: "מכרה עץ",
    icon: "wood",
    description: "עבדי המכרות כורתים כאן עץ לבנייה ולצבא.",
    producedResource: "wood",
    supportsSlaves: true,
  },
  IRON_MINE: {
    label: "מכרה ברזל",
    icon: "iron",
    description: "ברזל הוא הבסיס לכל כלי הנשק של האימפריה.",
    producedResource: "iron",
    supportsSlaves: true,
  },
  STONE_QUARRY: {
    label: "מחצבת אבן",
    icon: "stone",
    description: "אבן איכותית לחומות, מבנים וביצורים.",
    producedResource: "stone",
    supportsSlaves: true,
  },
  BARRACKS: {
    label: "מחנה אימונים",
    icon: "army",
    description: "כאן מאומנים חיילי האימפריה.",
    producedResource: null,
    supportsSlaves: false,
  },
  SPY_CENTER: {
    label: "מרכז מודיעין",
    icon: "spy",
    description: "מרכז הריגול של האימפריה. נדרש להכשרת מרגלים.",
    producedResource: null,
    supportsSlaves: false,
  },
};

export const BUILDING_TYPES = Object.keys(BUILDING_META) as BuildingType[];

/** The four resource mines, in canonical order (also the remainder order for equal splits). */
export const PRODUCTION_BUILDING_TYPES = [
  "GOLD_MINE",
  "WOOD_CAMP",
  "IRON_MINE",
  "STONE_QUARRY",
] as const satisfies readonly BuildingType[];

export type ProductionBuildingType = (typeof PRODUCTION_BUILDING_TYPES)[number];

export function isProductionBuilding(type: BuildingType): type is ProductionBuildingType {
  return (PRODUCTION_BUILDING_TYPES as readonly BuildingType[]).includes(type);
}

/** Mine for each storable resource, matching PRODUCTION_BUILDING_TYPES order. */
export const RESOURCE_TO_MINE: Record<StorableResource, ProductionBuildingType> = {
  gold: "GOLD_MINE",
  wood: "WOOD_CAMP",
  iron: "IRON_MINE",
  stone: "STONE_QUARRY",
};

/* ------------------------------ mines ------------------------------ */

/**
 * Highest mine level. Yield per slave runs 0, 2, 4, … up to 500, so the top
 * level is 250 (level × 2 = 500).
 */
export const MINE_MAX_LEVEL = 250;

/**
 * Production per assigned mine slave per regular update. The yield runs
 * 0, 2, 4, … up to 500 (level × 2) — an unupgraded mine (level 0) produces
 * nothing until it is upgraded.
 */
export function mineProductionValue(level: number): number {
  // Floored. Nothing in the game writes a negative mine level today — the
  // upgrade path is monotonic and the admin form clamps — but this figure is
  // multiplied by the slave count and credited straight to the empire, so a
  // negative level would *debit* resources on every tick. Clamping here costs
  // nothing and means the next caller cannot reintroduce it.
  return Math.max(0, level) * 2;
}

/** Production per regular update = assigned mine slaves * production value. */
export function mineProductionPerTick(level: number, assignedSlaves: number): number {
  return assignedSlaves * mineProductionValue(level);
}

/** Per-tier base price of a mine upgrade, in the mine's own resource. */
const MINE_UPGRADE_BASE: Record<StorableResource, number> = {
  gold: 500 * 1.5,
  wood: 300 * 1.4,
  iron: 300 * 1.4,
  stone: 250 * 1.4,
};

/**
 * Cost to upgrade a mine from `level` to `level + 1`. Priced by the next
 * tier so the first upgrade (level 0 → 1) is never free. Each mine is
 * upgraded with its own resource only — a gold mine costs gold, a wood
 * camp costs wood, and so on; the other three resources are always 0.
 */
export function mineUpgradeCost(level: number, resource: StorableResource) {
  const tier = level + 1;
  return {
    gold: 0,
    wood: 0,
    iron: 0,
    stone: 0,
    [resource]: Math.round(MINE_UPGRADE_BASE[resource] * tier),
  };
}

/* ------------------------------ units ------------------------------ */

export interface UnitMeta {
  label: string;
  labelPlural: string;
  icon: IconName;
  description: string;
  /** Training is free of resources — each unit converts one citizen. */
  citizenCost: number;
  power: number;
}

export const UNIT_META = {
  soldiers: {
    label: "חייל",
    labelPlural: "חיילים",
    icon: "army",
    description: "כוח הלחימה המרכזי של האימפריה.",
    citizenCost: 1,
    power: 10,
  },
  spies: {
    label: "מרגל",
    labelPlural: "מרגלים",
    icon: "spy",
    description: "חושפים מידע על אימפריות יריבות.",
    citizenCost: 1,
    power: 0,
  },
  mineSlaves: {
    label: "עבד מכרות",
    labelPlural: "עבדי מכרות",
    icon: "mine",
    description: "מוצבים במכרות ומגדילים את תפוקת המשאבים.",
    citizenCost: 1,
    power: 0,
  },
} as const satisfies Record<string, UnitMeta>;

export type UnitKey = keyof typeof UNIT_META;
export const UNIT_KEYS = Object.keys(UNIT_META) as UnitKey[];

/** Only soldiers contribute to military power. */
export const SOLDIER_POWER = UNIT_META.soldiers.power;

/**
 * Intelligence rating per spy. A readable player stat only — spy mission
 * success is still driven by the intelligence upgrade + spy weapons.
 */
export const SPY_POWER = 10;

/* ------------------------------ resource storages ------------------------------ */

export interface StorageMeta {
  label: string;
  icon: IconName;
  resourceKey: StorableResource;
}

export const STORAGE_META: Record<ResourceStorageType, StorageMeta> = {
  GOLD: { label: "מחסן זהב", icon: "gold", resourceKey: "gold" },
  WOOD: { label: "מחסן עץ", icon: "wood", resourceKey: "wood" },
  IRON: { label: "מחסן ברזל", icon: "iron", resourceKey: "iron" },
  STONE: { label: "מחסן אבן", icon: "stone", resourceKey: "stone" },
};

export const STORAGE_TYPES = Object.keys(STORAGE_META) as ResourceStorageType[];

/** Warehouse capacity per level, per resource. */
export const STORAGE_CAPACITY_PER_LEVEL = 10_000;

export function storageCapacityForLevel(level: number): number {
  return level * STORAGE_CAPACITY_PER_LEVEL;
}

export function storageUpgradeCost(level: number) {
  return {
    gold: Math.round(400 * level * 1.6),
    wood: Math.round(300 * level * 1.6),
    iron: Math.round(250 * level * 1.6),
    stone: Math.round(250 * level * 1.6),
  };
}

/* ------------------------------ empire upgrades ------------------------------ */

export interface EmpireUpgradeMeta {
  label: string;
  icon: IconName;
  description: string;
  /** Human-readable effect for a given level. */
  /**
   * `rate` is only read by CITIZEN_GROWTH, whose effect is admin-tunable; every
   * other upgrade derives its label from deploy-time constants and ignores it.
   */
  effectLabel: (level: number, rate?: CitizenRate) => string;
  /** Highest reachable level; undefined means uncapped. */
  maxLevel?: number;
}

/**
 * The citizen-intake rate: a flat base plus a per-level step. Lives here rather
 * than in config.ts so client code can render the curve, and so `DEFAULT_TUNABLES`
 * and this function can never drift apart — config.ts seeds its defaults from
 * these two constants.
 */
export const DEFAULT_CITIZENS_BASE = 20;
export const DEFAULT_CITIZENS_PER_LEVEL = 10;

/** The live half of `GameTunables["daily"]` that shapes the citizen curve. */
export interface CitizenRate {
  citizensBase: number;
  citizensPerLevel: number;
}

const DEFAULT_CITIZEN_RATE: CitizenRate = {
  citizensBase: DEFAULT_CITIZENS_BASE,
  citizensPerLevel: DEFAULT_CITIZENS_PER_LEVEL,
};

/**
 * Citizens received on each daily update.
 *
 * `rate` is the live `daily` tunables — pass them anywhere the number is shown
 * to a player, or an admin edit to the balance config will silently change what
 * lands in the treasury while every screen keeps printing the old figure. The
 * default is only for derived, deploy-time ladders (achievement goals), which
 * must stay pinned to the shipped curve rather than move under a live edit.
 */
export function citizensPerDailyUpdate(
  citizenGrowthLevel: number,
  rate: CitizenRate = DEFAULT_CITIZEN_RATE
): number {
  return rate.citizensBase + citizenGrowthLevel * rate.citizensPerLevel;
}

/**
 * Citizen-intake upgrade levels unlocked per city. At the default step of
 * {@link DEFAULT_CITIZENS_PER_LEVEL} that makes each city worth 100 citizens
 * per daily update.
 */
export const CITIZEN_GROWTH_LEVELS_PER_CITY = 10;

/**
 * Highest CITIZEN_GROWTH level for an empire holding `cities` cities: 10 levels
 * per city. The upgrade locks once it reaches this ceiling and founding a new
 * city unlocks another 10 levels — so growth resumes after each city upgrade.
 */
export function citizenGrowthMaxLevel(cities: number): number {
  return cities * CITIZEN_GROWTH_LEVELS_PER_CITY;
}

/** Top level of the intelligence upgrade. */
export const INTELLIGENCE_MAX_LEVEL = 15;

/**
 * The intelligence upgrade multiplies an empire's raw spy power (spies + spy
 * weapons) by +10% per level. Spy missions are resolved deterministically by
 * comparing the attacker's intelligence power against the defender's — no dice
 * roll — so every level directly widens the gap in your favour.
 */
export function intelligencePowerMultiplier(intelligenceLevel: number): number {
  return 1 + intelligenceLevel * 0.1;
}

/** Top level of the wheel-luck upgrade — each level adds 1%, capped at 15%. */
export const WHEEL_LUCK_MAX_LEVEL = 15;

/**
 * Extra chance (as a fraction, e.g. 0.1 = +10%) the wheel-luck upgrade adds to
 * winning a wheel-of-fortune spin — both from throwing away an item and from a
 * winning attack. +1% per level, capped at +15% at level 15.
 */
export function wheelLuckBonus(level: number): number {
  return Math.min(WHEEL_LUCK_MAX_LEVEL, level) * 0.01;
}

/**
 * Wheel luck is the one upgrade priced as a luxury: free spins are the scarcest
 * currency in the game, so every percent has to hurt. The curve is geometric,
 * not linear like the other upgrades — the *first* purchase already costs three
 * times a second city (3M gold), and the last one (14 → 15) lands near a
 * billion. All 14 purchases together run to roughly 2.5B gold, an endgame sink.
 *
 * Declared here rather than beside the other cost functions further down because
 * EMPIRE_UPGRADE_META prints the growth factor in its description, and that
 * object literal is evaluated at module init — a `const` below it would be in
 * its temporal dead zone.
 */
const WHEEL_LUCK_BASE_COST = {
  gold: 3_000_000,
  wood: 1_500_000,
  iron: 1_500_000,
  stone: 1_000_000,
} as const;

/** Each wheel-luck level multiplies the previous level's price by this. */
export const WHEEL_LUCK_COST_GROWTH = 1.55;

/** Round to three significant figures so prices read as prices, not as noise. */
function roundPrice(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(value)) - 2);
  return Math.round(value / magnitude) * magnitude;
}

/** Cost to take wheel luck from `level` to `level + 1`. */
export function wheelLuckUpgradeCost(level: number) {
  // Levels start at 1, so the first purchase (1 → 2) pays the base price flat.
  const mult = WHEEL_LUCK_COST_GROWTH ** Math.max(0, level - 1);
  return {
    gold: roundPrice(WHEEL_LUCK_BASE_COST.gold * mult),
    wood: roundPrice(WHEEL_LUCK_BASE_COST.wood * mult),
    iron: roundPrice(WHEEL_LUCK_BASE_COST.iron * mult),
    stone: roundPrice(WHEEL_LUCK_BASE_COST.stone * mult),
  };
}

/** Highest number of deposits the upgrade can reach. */
export const BANK_DEPOSIT_MAX = 10;
/** Top level of the deposit-count upgrade — level 9 reaches the 10-deposit cap. */
export const BANK_DEPOSIT_COUNT_MAX_LEVEL = 9;

/** Bank deposits allowed between one daily update and the next (capped at 10). */
export function allowedDepositsPerDailyPeriod(level: number): number {
  return Math.min(BANK_DEPOSIT_MAX, 1 + level);
}

/** Top level of the interest upgrade — 6 levels, 1% each, capped at 6%. */
export const BANK_DAILY_INTEREST_MAX_LEVEL = 6;

/** Interest added per upgrade level, and the ceiling the ladder reaches. */
export const BANK_INTEREST_PER_LEVEL = 0.01;
export const BANK_INTEREST_MAX_RATE = 0.06;

/**
 * Bank interest per daily update: 1% per upgrade level, capped at 6% (reached at
 * level 6). The upgrade is also blocked once it hits
 * `BANK_DAILY_INTEREST_MAX_LEVEL`, so the rate never plateaus with wasted upgrades.
 *
 * The rate is still large: interest lands twice a day and compounds on gold
 * `attackEmpire` cannot plunder, so at the ceiling the bank returns 12.4% a day.
 * What holds it in check is the *price* of the ladder, not the rate —
 * `bankInterestUpgradeCost` is geometric and the last rung costs more than three
 * tenth-cities, so 6% is a late-season trophy rather than something an empire
 * walks into. Every rung below it is a real decision between interest and
 * expansion.
 */
export function bankInterestRate(level: number): number {
  // Clamped at both ends: the ceiling is the fix for 15%-per-update compounding
  // on plunder-immune gold, and the floor stops a negative level from quietly
  // charging a player interest on their own savings.
  return Math.min(
    BANK_INTEREST_MAX_RATE,
    Math.max(0, level) * BANK_INTEREST_PER_LEVEL
  );
}

/**
 * Interest is the strongest compounding effect in the game, so its ladder is
 * priced like wheel luck rather than like the generic linear upgrades: the first
 * purchase (1 → 2) already costs twenty times a second city, and the last one
 * (5 → 6) lands past 5B. All five purchases together run to roughly 6.8B gold —
 * an endgame sink no empire clears in its first weeks.
 *
 * The growth factor is steep (×4) precisely *because* the ladder is short: with
 * only five rungs a gentler curve would make 6% a mid-season formality. Shorten
 * the ladder further and this factor has to rise again to keep the ceiling far.
 *
 * Declared above `EMPIRE_UPGRADE_META` because that object literal prints the
 * growth factor in its description and is evaluated at module init.
 */
const BANK_INTEREST_BASE_COST = {
  gold: 20_000_000,
  wood: 10_000_000,
  iron: 10_000_000,
  stone: 7_000_000,
} as const;

/** Each interest level multiplies the previous level's price by this. */
export const BANK_INTEREST_COST_GROWTH = 4;

/** Cost to take bank interest from `level` to `level + 1`. */
export function bankInterestUpgradeCost(level: number) {
  // Levels start at 1, so the first purchase (1 → 2) pays the base price flat.
  const mult = BANK_INTEREST_COST_GROWTH ** Math.max(0, level - 1);
  return {
    gold: roundPrice(BANK_INTEREST_BASE_COST.gold * mult),
    wood: roundPrice(BANK_INTEREST_BASE_COST.wood * mult),
    iron: roundPrice(BANK_INTEREST_BASE_COST.iron * mult),
    stone: roundPrice(BANK_INTEREST_BASE_COST.stone * mult),
  };
}

/* ------------------------------ cities ------------------------------ */

/** Highest number of cities a single empire can hold. */
export const MAX_CITIES = 10;

/** Hero levels demanded per city tier: the 2nd city needs 10, 3rd needs 20… */
export const CITY_HERO_LEVEL_PER_TIER = 10;

/**
 * Hero level the empire must reach before founding its next city. Scales with
 * how many cities it already holds: 10 for the 2nd city, 20 for the 3rd, and so
 * on (`cities` is the current count — 1 for the 2nd city, up to 9 for the 10th).
 */
export function cityHeroLevelRequired(cities: number): number {
  return cities * CITY_HERO_LEVEL_PER_TIER;
}

/**
 * Mine-production multiplier granted by the empire's cities: output scales
 * linearly with the current city count (×1 at one city, ×10 at ten). Because it
 * is derived from the live `cities` value on every tick, losing a city lowers
 * production automatically.
 */
export function cityProductionMultiplier(cities: number): number {
  return cities;
}

/** Every city tier above the first multiplies the previous tier's cost by this. */
export const CITY_COST_TIER_MULTIPLIER = 2.5;

/**
 * Cost to upgrade to the next city, going from `cities` → `cities + 1`. Upgrading
 * to the 2nd city costs 1M gold + 500K of each other resource; every tier past
 * that multiplies the whole bill — resources *and* soldiers — by 2.5. Soldiers
 * are a garrison requirement the empire must field, not a currency it spends.
 * `cities` is the current count — 1 for the second city, up to 9 for the tenth.
 */
export function cityCost(cities: number) {
  const tier = cities - 1; // 0 for the 2nd city … 8 for the 10th
  const mult = Math.pow(CITY_COST_TIER_MULTIPLIER, tier);
  return {
    gold: Math.round(1_000_000 * mult),
    wood: Math.round(500_000 * mult),
    iron: Math.round(500_000 * mult),
    stone: Math.round(500_000 * mult),
    soldiers: Math.round(200 * mult),
  };
}

/* ------------------------------ turns ------------------------------ */

/** Turns spent per attack. */
export const ATTACK_TURN_COST = 10;

/** Turns spent per spy mission. */
export const SPY_TURN_COST = 5;

/**
 * New-player protection window: a fresh empire can't be attacked or spied for
 * this long after registration, so newcomers aren't farmed the moment they join.
 * It ends early the instant the player launches their own first attack/spy —
 * you can't hide behind the shield while acting aggressively.
 */
export const NEWBIE_PROTECTION_MS = 48 * 60 * 60 * 1000; // 48 hours

export const TURNS_UPGRADE_MAX_LEVEL = 5;

/** Turns gained per regular update from the upgrade alone. */
export function turnsPerRegularUpdate(turnsUpgradeLevel: number): number {
  return turnsUpgradeLevel;
}

/**
 * A turns level is worth far more than its five rungs suggest: ticks fire every
 * {@link REGULAR_TICK_MINUTES} minutes, so each level is +288 turns a day, for
 * good — roughly 29 more attacks a day at {@link ATTACK_TURN_COST} turns each.
 * The ladder used to be linear off a 1,500-gold base, which put all four
 * purchases at ~27K gold in total: less than one mid-level mine upgrade for the
 * fuel to play the game four times over. It is geometric now, like interest and
 * wheel luck, sized so the first rung is a second city's worth of gold and the
 * last is a real mid-game decision (~7.6M gold for the whole ladder).
 *
 * Declared above `EMPIRE_UPGRADE_META` because that object literal prints the
 * growth factor in its description and is evaluated at module init.
 */
const TURNS_UPGRADE_BASE_COST = {
  gold: 300_000,
  wood: 150_000,
  iron: 150_000,
  stone: 100_000,
} as const;

/** Each turns level multiplies the previous level's price by this. */
export const TURNS_UPGRADE_COST_GROWTH = 2.5;

// DIAMOND_YIELD is a retired upgrade: the enum value is kept in the DB for
// existing rows, but it is no longer offered on the upgrades page or granted on
// daily updates, so it is excluded from the metadata that drives the UI.
export type ActiveEmpireUpgradeType = Exclude<EmpireUpgradeType, "DIAMOND_YIELD">;

export const EMPIRE_UPGRADE_META: Record<
  ActiveEmpireUpgradeType,
  EmpireUpgradeMeta
> = {
  CITIZEN_GROWTH: {
    label: "קבלת אזרחים",
    icon: "citizens",
    description: "מגדיל את כמות האזרחים שמתקבלת בכל עדכון יומי.",
    effectLabel: (level, rate) =>
      `${citizensPerDailyUpdate(level, rate)} אזרחים בכל עדכון יומי`,
  },
  INTELLIGENCE: {
    label: "מודיעין",
    icon: "spy",
    description:
      "מגדיל את כח המודיעין שלך. ריגול מצליח כשכח המודיעין שלך גדול מזה של היעד — בלי הגרלה.",
    effectLabel: (level) =>
      `+${Math.round((intelligencePowerMultiplier(level) - 1) * 100)}% כח מודיעין`,
    maxLevel: INTELLIGENCE_MAX_LEVEL,
  },
  BANK_DEPOSIT_COUNT: {
    label: "כמות הפקדות בבנק",
    icon: "bank",
    description: "מגדיל את מספר ההפקדות שניתן לבצע בבנק בין עדכון יומי לעדכון יומי.",
    effectLabel: (level) =>
      `${allowedDepositsPerDailyPeriod(level).toLocaleString("he-IL")} הפקדות בין עדכון יומי לעדכון יומי`,
    maxLevel: BANK_DEPOSIT_COUNT_MAX_LEVEL,
  },
  BANK_DAILY_INTEREST: {
    label: "ריבית בנק",
    icon: "gold",
    description:
      `מוסיף 1% לריבית שמתקבלת בבנק בכל עדכון יומי — עד ${Math.round(BANK_INTEREST_MAX_RATE * 100)}% ברמה ${BANK_DAILY_INTEREST_MAX_LEVEL}. הריבית מצטברת פעמיים ביום על זהב שאי אפשר לבזוז, ולכן הסולם יקר: כל רמה עולה פי ${BANK_INTEREST_COST_GROWTH} מקודמתה.`,
    effectLabel: (level) =>
      `${Math.round(bankInterestRate(level) * 100)}% ריבית בכל עדכון יומי`,
    maxLevel: BANK_DAILY_INTEREST_MAX_LEVEL,
  },
  TURNS_PER_REGULAR_UPDATE: {
    label: "קבלת תורות",
    icon: "turns",
    description:
      `מוסיף תור אחד לכל עדכון רגיל — כלומר ${TICKS_PER_DAY} תורות נוספות ביום, לתמיד. לכן הסולם יקר: כל רמה עולה פי ${TURNS_UPGRADE_COST_GROWTH} מקודמתה.`,
    effectLabel: (level) =>
      `+${turnsPerRegularUpdate(level)} תורות לעדכון רגיל (${(turnsPerRegularUpdate(level) * TICKS_PER_DAY).toLocaleString("he-IL")} ביום)`,
    maxLevel: TURNS_UPGRADE_MAX_LEVEL,
  },
  WHEEL_LUCK: {
    label: "מזל הגלגל",
    icon: "wheel",
    description:
      `מוסיף 1% לסיכוי לזכות בסיבוב גלגל מזל — מזריקת חפץ ומתקיפה מנצחת — עד ${WHEEL_LUCK_MAX_LEVEL}% ברמה המקסימלית. השדרוג היקר במשחק: כל רמה עולה פי ${WHEEL_LUCK_COST_GROWTH} מקודמתה.`,
    effectLabel: (level) => `+${Math.round(wheelLuckBonus(level) * 100)}% סיכוי לסיבוב גלגל מזל`,
    maxLevel: WHEEL_LUCK_MAX_LEVEL,
  },
};

export const EMPIRE_UPGRADE_TYPES = Object.keys(
  EMPIRE_UPGRADE_META
) as ActiveEmpireUpgradeType[];

/**
 * Effective max level for an upgrade given the empire's city count. Most upgrades
 * use the static `maxLevel` in their metadata; CITIZEN_GROWTH is capped
 * dynamically at 10 levels per city, so founding a new city unlocks 10 more.
 * Returns `undefined` for uncapped upgrades.
 */
export function empireUpgradeMaxLevel(
  type: ActiveEmpireUpgradeType,
  cities: number
): number | undefined {
  if (type === "CITIZEN_GROWTH") return citizenGrowthMaxLevel(cities);
  return EMPIRE_UPGRADE_META[type].maxLevel;
}

export function empireUpgradeCost(level: number) {
  return {
    gold: Math.round(1000 * level * 1.7),
    wood: Math.round(600 * level * 1.5),
    iron: Math.round(600 * level * 1.5),
    stone: Math.round(400 * level * 1.5),
  };
}

/** Cost to take the turns gain from `level` to `level + 1`. */
export function turnsUpgradeCost(level: number) {
  // Levels start at 1, so the first purchase (1 → 2) pays the base price flat.
  const mult = TURNS_UPGRADE_COST_GROWTH ** Math.max(0, level - 1);
  return {
    gold: roundPrice(TURNS_UPGRADE_BASE_COST.gold * mult),
    wood: roundPrice(TURNS_UPGRADE_BASE_COST.wood * mult),
    iron: roundPrice(TURNS_UPGRADE_BASE_COST.iron * mult),
    stone: roundPrice(TURNS_UPGRADE_BASE_COST.stone * mult),
  };
}

/** Cost to upgrade the given empire upgrade from `level` to `level + 1`. */
export function empireUpgradeCostFor(type: EmpireUpgradeType, level: number) {
  if (type === "TURNS_PER_REGULAR_UPDATE") return turnsUpgradeCost(level);
  if (type === "WHEEL_LUCK") return wheelLuckUpgradeCost(level);
  if (type === "BANK_DAILY_INTEREST") return bankInterestUpgradeCost(level);
  return empireUpgradeCost(level);
}

/* ------------------------------ battle ------------------------------ */

/** Defender bonus in battle (20%). */
export const DEFENSE_BONUS = 1.2;

/** Winner steals up to 10% of defender resources. */
export const PLUNDER_RATE = 0.1;

/**
 * Enslavement: a winning attack enslaves part of the defender's soldiers when
 * the defender has more than 19 of them. The haul scales with the defender's
 * army size and lands in the attacker's free mine-slave pool (not citizens).
 */
export const ENSLAVE_MIN_SOLDIERS = 20;
export const ENSLAVE_RATE = 0.1;
