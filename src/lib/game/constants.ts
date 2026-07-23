import type {
  BuildingType,
  EmpireUpgradeType,
  ResourceStorageType,
} from "@prisma/client";

export const RESOURCE_META = {
  gold: { label: "זהב", icon: "🪙" },
  wood: { label: "עץ", icon: "🪵" },
  iron: { label: "ברזל", icon: "⚙️" },
  stone: { label: "אבן", icon: "🪨" },
  diamonds: { label: "יהלומים", icon: "💎" },
  citizens: { label: "אזרחים", icon: "👥" },
  turns: { label: "תורות", icon: "⏳" },
} as const;

export type ResourceKey = keyof typeof RESOURCE_META;

/** The four storable resources — each has a dedicated warehouse. */
export type StorableResource = "gold" | "wood" | "iron" | "stone";

/* ------------------------------ update cadence ------------------------------ */

export const GAME_TIMEZONE = "Asia/Jerusalem";

/** Regular production tick length, in minutes. */
export const REGULAR_TICK_MINUTES = 5;
export const REGULAR_TICK_MS = REGULAR_TICK_MINUTES * 60 * 1000;

/** Daily update wall times (Asia/Jerusalem). */
export const DAILY_UPDATE_TIMES: ReadonlyArray<{ hour: number; minute: number }> = [
  { hour: 7, minute: 30 },
  { hour: 19, minute: 30 },
];

/* ------------------------------ buildings ------------------------------ */

export interface BuildingMeta {
  label: string;
  icon: string;
  description: string;
  producedResource: StorableResource | null;
  supportsSlaves: boolean;
}

export const BUILDING_META: Record<BuildingType, BuildingMeta> = {
  GOLD_MINE: {
    label: "מכרה זהב",
    icon: "🪙",
    description: "כורה זהב מהאדמה. ככל שרמת המכרה גבוהה יותר ויש יותר עבדי מכרות — התפוקה עולה.",
    producedResource: "gold",
    supportsSlaves: true,
  },
  WOOD_CAMP: {
    label: "מכרה עץ",
    icon: "🪵",
    description: "עבדי המכרות כורתים כאן עץ לבנייה ולצבא.",
    producedResource: "wood",
    supportsSlaves: true,
  },
  IRON_MINE: {
    label: "מכרה ברזל",
    icon: "⚙️",
    description: "ברזל הוא הבסיס לכל כלי הנשק של האימפריה.",
    producedResource: "iron",
    supportsSlaves: true,
  },
  STONE_QUARRY: {
    label: "מחצבת אבן",
    icon: "🪨",
    description: "אבן איכותית לחומות, מבנים וביצורים.",
    producedResource: "stone",
    supportsSlaves: true,
  },
  BARRACKS: {
    label: "מחנה אימונים",
    icon: "⚔️",
    description: "כאן מאומנים חיילי האימפריה.",
    producedResource: null,
    supportsSlaves: false,
  },
  SPY_CENTER: {
    label: "מרכז מודיעין",
    icon: "🕵️",
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
  return level * 2;
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
  icon: string;
  description: string;
  /** Training is free of resources — each unit converts one citizen. */
  citizenCost: number;
  power: number;
}

export const UNIT_META = {
  soldiers: {
    label: "חייל",
    labelPlural: "חיילים",
    icon: "🪖",
    description: "כוח הלחימה המרכזי של האימפריה.",
    citizenCost: 1,
    power: 10,
  },
  spies: {
    label: "מרגל",
    labelPlural: "מרגלים",
    icon: "🕵️",
    description: "חושפים מידע על אימפריות יריבות.",
    citizenCost: 1,
    power: 0,
  },
  mineSlaves: {
    label: "עבד מכרות",
    labelPlural: "עבדי מכרות",
    icon: "⛏️",
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
  icon: string;
  resourceKey: StorableResource;
}

export const STORAGE_META: Record<ResourceStorageType, StorageMeta> = {
  GOLD: { label: "מחסן זהב", icon: "🪙", resourceKey: "gold" },
  WOOD: { label: "מחסן עץ", icon: "🪵", resourceKey: "wood" },
  IRON: { label: "מחסן ברזל", icon: "⚙️", resourceKey: "iron" },
  STONE: { label: "מחסן אבן", icon: "🪨", resourceKey: "stone" },
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
  icon: string;
  description: string;
  /** Human-readable effect for a given level. */
  effectLabel: (level: number) => string;
  /** Highest reachable level; undefined means uncapped. */
  maxLevel?: number;
}

/** Citizens received on each daily update. */
export function citizensPerDailyUpdate(citizenGrowthLevel: number): number {
  return 20 + citizenGrowthLevel * 5;
}

/** Citizen-intake upgrade levels unlocked per city. */
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

/** Top level of the wheel-luck upgrade — each level adds 1%, capped at 10%. */
export const WHEEL_LUCK_MAX_LEVEL = 10;

/**
 * Extra chance (as a fraction, e.g. 0.1 = +10%) the wheel-luck upgrade adds to
 * winning a wheel-of-fortune spin — both from throwing away an item and from a
 * winning attack. +1% per level, capped at +10% at level 10.
 */
export function wheelLuckBonus(level: number): number {
  return Math.min(WHEEL_LUCK_MAX_LEVEL, level) * 0.01;
}

/** Highest number of deposits the upgrade can reach. */
export const BANK_DEPOSIT_MAX = 10;
/** Top level of the deposit-count upgrade — level 9 reaches the 10-deposit cap. */
export const BANK_DEPOSIT_COUNT_MAX_LEVEL = 9;

/** Bank deposits allowed between one daily update and the next (capped at 10). */
export function allowedDepositsPerDailyPeriod(level: number): number {
  return Math.min(BANK_DEPOSIT_MAX, 1 + level);
}

/** Top level of the interest upgrade — each level adds 1%, capped at 15%. */
export const BANK_DAILY_INTEREST_MAX_LEVEL = 15;

/**
 * Bank interest per daily update: 1% per upgrade level, capped at 15% (reached at
 * level 15). The upgrade is also blocked once it hits `BANK_DAILY_INTEREST_MAX_LEVEL`,
 * so the rate never plateaus with wasted upgrades.
 */
export function bankInterestRate(level: number): number {
  return Math.min(0.15, level * 0.01);
}

/* ------------------------------ cities ------------------------------ */

/** Citizen capacity contributed by each city. */
export const CITIZENS_PER_CITY = 100;

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
 * Total citizen capacity for an empire holding `cities` cities. The first city
 * holds 100, the second raises the ceiling to 200, and so on up to 1,000 at ten
 * cities. The daily citizen intake is clamped to this ceiling.
 */
export function citizenCapacity(cities: number): number {
  return cities * CITIZENS_PER_CITY;
}

/**
 * Mine-production multiplier granted by the empire's cities: output scales
 * linearly with the current city count (×1 at one city, ×10 at ten). Because it
 * is derived from the live `cities` value on every tick, losing a city — e.g. to
 * an enemy CITY_SIEGE spell — lowers production automatically.
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

export const TURNS_UPGRADE_MAX_LEVEL = 5;

/** Turns gained per regular update from the upgrade alone. */
export function turnsPerRegularUpdate(turnsUpgradeLevel: number): number {
  return turnsUpgradeLevel;
}

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
    icon: "👥",
    description: "מגדיל את כמות האזרחים שמתקבלת בכל עדכון יומי.",
    effectLabel: (level) => `${citizensPerDailyUpdate(level)} אזרחים בכל עדכון יומי`,
  },
  INTELLIGENCE: {
    label: "מודיעין",
    icon: "🕵️",
    description:
      "מגדיל את כח המודיעין שלך. ריגול מצליח כשכח המודיעין שלך גדול מזה של היעד — בלי הגרלה.",
    effectLabel: (level) =>
      `+${Math.round((intelligencePowerMultiplier(level) - 1) * 100)}% כח מודיעין`,
    maxLevel: INTELLIGENCE_MAX_LEVEL,
  },
  BANK_DEPOSIT_COUNT: {
    label: "כמות הפקדות בבנק",
    icon: "🏦",
    description: "מגדיל את מספר ההפקדות שניתן לבצע בבנק בין עדכון יומי לעדכון יומי.",
    effectLabel: (level) =>
      `${allowedDepositsPerDailyPeriod(level).toLocaleString("he-IL")} הפקדות בין עדכון יומי לעדכון יומי`,
    maxLevel: BANK_DEPOSIT_COUNT_MAX_LEVEL,
  },
  BANK_DAILY_INTEREST: {
    label: "ריבית בנק",
    icon: "💰",
    description: "מגדיל את הריבית שמתקבלת בבנק בכל עדכון יומי.",
    effectLabel: (level) => `${Math.round(bankInterestRate(level) * 100)}% ריבית בכל עדכון יומי`,
    maxLevel: BANK_DAILY_INTEREST_MAX_LEVEL,
  },
  TURNS_PER_REGULAR_UPDATE: {
    label: "קבלת תורות",
    icon: "⏳",
    description: "מגדיל את כמות התורות שמתקבלת בכל עדכון רגיל.",
    effectLabel: (level) => `+${turnsPerRegularUpdate(level)} תורות לעדכון רגיל`,
    maxLevel: TURNS_UPGRADE_MAX_LEVEL,
  },
  WHEEL_LUCK: {
    label: "מזל הגלגל",
    icon: "🎡",
    description:
      "מגדיל את הסיכוי לזכות בסיבוב גלגל מזל מזריקת חפץ ומתקיפה מנצחת.",
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

/** The turns-gain upgrade is priced steeper than the generic upgrades. */
export function turnsUpgradeCost(level: number) {
  return {
    gold: Math.round(1500 * level * 1.8),
    wood: Math.round(800 * level * 1.6),
    iron: Math.round(800 * level * 1.6),
    stone: Math.round(600 * level * 1.5),
  };
}

/** Cost to upgrade the given empire upgrade from `level` to `level + 1`. */
export function empireUpgradeCostFor(type: EmpireUpgradeType, level: number) {
  return type === "TURNS_PER_REGULAR_UPDATE"
    ? turnsUpgradeCost(level)
    : empireUpgradeCost(level);
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
