import type { WeaponCategory } from "@prisma/client";

/* ------------------------------ weapon categories ------------------------------ */

export interface WeaponCategoryMeta {
  label: string;
  icon: string;
  /** "כוח X מנשקים" summary label. */
  powerLabel: string;
}

export const WEAPON_CATEGORY_META: Record<WeaponCategory, WeaponCategoryMeta> = {
  ATTACK: { label: "התקפה", icon: "⚔️", powerLabel: "כוח התקפה מנשקים" },
  DEFENSE: { label: "הגנה", icon: "🛡️", powerLabel: "כוח הגנה מנשקים" },
  SPY: { label: "ריגול", icon: "🕵️", powerLabel: "כוח ריגול מנשקים" },
};

export const WEAPON_CATEGORIES = Object.keys(
  WEAPON_CATEGORY_META
) as WeaponCategory[];

/* ------------------------------ weapon definitions ------------------------------ */

export interface WeaponCost {
  gold: number;
  wood: number;
  iron: number;
  stone: number;
}

export interface WeaponDefinition {
  key: string;
  category: WeaponCategory;
  name: string;
  description: string;
  tier: number;
  power: number;
  cost: WeaponCost;
}

/** Static weapon definitions — not stored as editable DB rows yet. */
export const WEAPONS: readonly WeaponDefinition[] = [
  /* ---- attack ---- */
  {
    key: "IRON_SWORDS",
    category: "ATTACK",
    name: "חרבות ברזל",
    description: "חרבות בסיסיות ואמינות לחיילי החזית.",
    tier: 1,
    power: 5,
    cost: { gold: 100, wood: 0, iron: 80, stone: 0 },
  },
  {
    key: "BATTLE_BOWS",
    category: "ATTACK",
    name: "קשתות קרב",
    description: "קשתות ארוכות טווח שפוגעות באויב עוד לפני ההתנגשות.",
    tier: 2,
    power: 9,
    cost: { gold: 160, wood: 80, iron: 120, stone: 0 },
  },
  {
    key: "BALLISTAS",
    category: "ATTACK",
    name: "בליסטראות",
    description: "מכונות ירי כבדות שמרסקות שורות שלמות של אויבים.",
    tier: 3,
    power: 20,
    cost: { gold: 450, wood: 250, iron: 300, stone: 120 },
  },
  {
    key: "SIEGE_CANNONS",
    category: "ATTACK",
    name: "תותחי מצור",
    description: "תותחים אדירים שמפילים חומות ומבצרים.",
    tier: 4,
    power: 45,
    cost: { gold: 1200, wood: 400, iron: 900, stone: 600 },
  },
  {
    key: "FLAME_BLADES",
    category: "ATTACK",
    name: "להבי אש",
    description: "להבים אגדיים עטופי אש — נשק העילית של האימפריה.",
    tier: 5,
    power: 90,
    cost: { gold: 3000, wood: 800, iron: 1800, stone: 1000 },
  },
  /* ---- defense ---- */
  {
    key: "WOODEN_SHIELDS",
    category: "DEFENSE",
    name: "מגני עץ",
    description: "מגנים פשוטים שבולמים את המכות הראשונות.",
    tier: 1,
    power: 5,
    cost: { gold: 80, wood: 120, iron: 40, stone: 0 },
  },
  {
    key: "IRON_ARMOR",
    category: "DEFENSE",
    name: "שריון ברזל",
    description: "שריון כבד שמגן על החיילים בקרב פנים אל פנים.",
    tier: 2,
    power: 10,
    cost: { gold: 170, wood: 80, iron: 160, stone: 0 },
  },
  {
    key: "SPEAR_WALLS",
    category: "DEFENSE",
    name: "חומות חניתות",
    description: "שורות חניתות דחוסות שעוצרות כל הסתערות.",
    tier: 3,
    power: 22,
    cost: { gold: 500, wood: 250, iron: 350, stone: 250 },
  },
  {
    key: "WATCH_TOWERS",
    category: "DEFENSE",
    name: "מגדלי שמירה",
    description: "מגדלים מבוצרים שמזהים את האויב מרחוק ויורים בו מלמעלה.",
    tier: 4,
    power: 48,
    cost: { gold: 1300, wood: 500, iron: 900, stone: 900 },
  },
  {
    key: "IMPERIUM_WALL",
    category: "DEFENSE",
    name: "חומת אימפריום",
    description: "החומה האולטימטיבית — הגנה שאין דומה לה בממלכות.",
    tier: 5,
    power: 95,
    cost: { gold: 3500, wood: 1000, iron: 2000, stone: 1800 },
  },
  /* ---- spy ---- */
  {
    key: "CAMOUFLAGE_CLOAKS",
    category: "SPY",
    name: "גלימות הסוואה",
    description: "גלימות שמסתירות את המרגלים מעיני השומרים.",
    tier: 1,
    power: 4,
    cost: { gold: 120, wood: 100, iron: 40, stone: 0 },
  },
  {
    key: "SHADOW_DAGGERS",
    category: "SPY",
    name: "סכיני צללים",
    description: "סכינים שקטים למשימות חשאיות במיוחד.",
    tier: 2,
    power: 8,
    cost: { gold: 220, wood: 120, iron: 120, stone: 0 },
  },
  {
    key: "INTEL_RAVENS",
    category: "SPY",
    name: "עורבי מודיעין",
    description: "עורבים מאולפים שמעבירים מסרים ומידע מעבר לקווי האויב.",
    tier: 3,
    power: 18,
    cost: { gold: 650, wood: 400, iron: 250, stone: 200 },
  },
  {
    key: "DISGUISE_RINGS",
    category: "SPY",
    name: "טבעות התחזות",
    description: "טבעות קסומות שמאפשרות למרגל להתחזות לכל אדם.",
    tier: 4,
    power: 40,
    cost: { gold: 1600, wood: 700, iron: 700, stone: 500 },
  },
  {
    key: "SPY_NETWORK",
    category: "SPY",
    name: "רשת מרגלים",
    description: "רשת סוכנים חובקת ממלכות — עיניים ואוזניים בכל מקום.",
    tier: 5,
    power: 85,
    cost: { gold: 4000, wood: 1200, iron: 1500, stone: 1000 },
  },
];

export function weaponsOfCategory(category: WeaponCategory): WeaponDefinition[] {
  return WEAPONS.filter((w) => w.category === category).sort(
    (a, b) => a.tier - b.tier
  );
}

const WEAPON_BY_KEY = new Map(WEAPONS.map((w) => [w.key, w]));

export function weaponByKey(key: string): WeaponDefinition | undefined {
  return WEAPON_BY_KEY.get(key);
}

/* ------------------------------ tier unlocks ------------------------------ */

/** Every category starts with the first two weapon tiers unlocked. */
export const INITIAL_WEAPON_UNLOCKED_TIER = 2;

export const MAX_WEAPON_TIER = 5;

/** Cost to unlock tier `currentUnlockedTier + 1` in a category. */
export function weaponTierUnlockCost(currentUnlockedTier: number): WeaponCost {
  return {
    gold: Math.round(2500 * currentUnlockedTier * 1.8),
    wood: Math.round(1200 * currentUnlockedTier * 1.6),
    iron: Math.round(1200 * currentUnlockedTier * 1.6),
    stone: Math.round(900 * currentUnlockedTier * 1.5),
  };
}

/* ------------------------------ power ------------------------------ */

export interface WeaponQuantityRow {
  weaponKey: string;
  quantity: number;
}

/** Sum of quantity * weapon power over the given category. */
export function weaponsPower(
  rows: readonly WeaponQuantityRow[],
  category: WeaponCategory
): number {
  let total = 0;
  for (const row of rows) {
    const weapon = weaponByKey(row.weaponKey);
    if (weapon?.category === category) total += row.quantity * weapon.power;
  }
  return total;
}

/**
 * Spy weapons slightly improve spy success chance: up to +15 percentage
 * points, one point per 100 spy weapon power.
 */
export function spyWeaponsBonusPercent(spyWeaponsPower: number): number {
  return Math.min(15, Math.floor(spyWeaponsPower / 100));
}

/** Final spy chance (fraction), capped at 95%. */
export function finalSpyChance(
  intelligenceChance: number,
  spyWeaponsPowerValue: number
): number {
  return Math.min(
    0.95,
    intelligenceChance + spyWeaponsBonusPercent(spyWeaponsPowerValue) / 100
  );
}
