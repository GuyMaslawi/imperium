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

export const MINE_MAX_LEVEL = 500;

/** Production per assigned mine slave per regular update. Each level adds +5. */
export function mineProductionValue(level: number): number {
  return 5 + level * 5;
}

/** Production per regular update = assigned mine slaves * production value. */
export function mineProductionPerTick(level: number, assignedSlaves: number): number {
  return assignedSlaves * mineProductionValue(level);
}

export function mineUpgradeCost(level: number) {
  return {
    gold: Math.round(500 * level * 1.5),
    wood: Math.round(300 * level * 1.4),
    iron: Math.round(300 * level * 1.4),
    stone: Math.round(250 * level * 1.4),
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

/** Spy mission success chance, capped at 90%. */
export function spySuccessChance(intelligenceLevel: number): number {
  return Math.min(0.9, 0.6 + intelligenceLevel * 0.03);
}

/** Bank deposits allowed between one daily update and the next. */
export function allowedDepositsPerDailyPeriod(level: number): number {
  return 1 + level;
}

/** Bank interest per daily update, capped at 10%. */
export function bankInterestRate(level: number): number {
  return Math.min(0.1, 0.01 + level * 0.0025);
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

export const EMPIRE_UPGRADE_META: Record<EmpireUpgradeType, EmpireUpgradeMeta> = {
  CITIZEN_GROWTH: {
    label: "קבלת אזרחים",
    icon: "👥",
    description: "מגדיל את כמות האזרחים שמתקבלת בכל עדכון יומי.",
    effectLabel: (level) => `${citizensPerDailyUpdate(level)} אזרחים בכל עדכון יומי`,
  },
  INTELLIGENCE: {
    label: "מודיעין",
    icon: "🕵️",
    description: "מגדיל את סיכויי ההצלחה בריגול ואת איכות המידע שנחשף.",
    effectLabel: (level) => `${Math.round(spySuccessChance(level) * 100)}% סיכוי הצלחה בריגול`,
  },
  BANK_DEPOSIT_COUNT: {
    label: "כמות הפקדות בבנק",
    icon: "🏦",
    description: "מגדיל את מספר ההפקדות שניתן לבצע בבנק בין עדכון יומי לעדכון יומי.",
    effectLabel: (level) =>
      `${allowedDepositsPerDailyPeriod(level).toLocaleString("he-IL")} הפקדות בין עדכון יומי לעדכון יומי`,
  },
  BANK_DAILY_INTEREST: {
    label: "ריבית בנק",
    icon: "💰",
    description: "מגדיל את הריבית שמתקבלת בבנק בכל עדכון יומי.",
    effectLabel: (level) => `${(bankInterestRate(level) * 100).toFixed(2)}% ריבית בכל עדכון יומי`,
  },
  TURNS_PER_REGULAR_UPDATE: {
    label: "קבלת תורות",
    icon: "⏳",
    description: "מגדיל את כמות התורות שמתקבלת בכל עדכון רגיל.",
    effectLabel: (level) => `+${turnsPerRegularUpdate(level)} תורות לעדכון רגיל`,
    maxLevel: TURNS_UPGRADE_MAX_LEVEL,
  },
};

export const EMPIRE_UPGRADE_TYPES = Object.keys(
  EMPIRE_UPGRADE_META
) as EmpireUpgradeType[];

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
