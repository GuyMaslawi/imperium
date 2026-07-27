import type { HeroRarity } from "@prisma/client";
import { MAX_CITIES, type StorableResource } from "./constants";

/**
 * City bosses — the PvE tyrant that rules every city tier.
 *
 * Each of the ten city tiers (`Empire.cities`, 1..MAX_CITIES) is held by one
 * named boss. Unlike a player target, a boss is a *fixed, public* wall: its
 * power is printed on the rankings page, so a player can see exactly how much
 * army they still have to raise before the fight is winnable. There is no dice
 * roll — attack power strictly greater than the boss's power wins.
 *
 * Three numbers define the whole feature:
 *
 * 1. **Turn cost** — 300 turns in the first city, +200 for every city after
 *    (see `bossTurnCost`). At the base turn income (1 turn / 5 min) 300 turns is
 *    roughly one full daily-update cycle of banked turns, so a boss run is a
 *    deliberate, expensive commitment rather than something you spam.
 * 2. **Power** — static per tier, growing on the same ×2.5-per-tier curve the
 *    game already uses for `cityCost`. Because it never moves, "I need a bigger
 *    army" is always the answer, and the answer is quantified.
 * 3. **Reward** — scales with the tier *and* with the current season day, on the
 *    same daily-growth idea as the season pass (see `seasonPassRewardAmount`),
 *    so the haul is always meaningful for where the season actually is. It is
 *    tuned to pay noticeably more than the turns would have earned as ordinary
 *    attacks, which is what makes the boss worth attacking at all.
 *
 * Deliberately absent: diamonds. Same reasoning as the season pass — a
 * repeatable source of diamonds undercuts the real-money store (see
 * DiamondPurchase). The boss pays resources, slaves, hero XP and gear.
 */

/* ------------------------------ catalog ------------------------------ */

export interface CityBoss {
  /** Stable key — also the portrait filename under /public/boss. */
  key: string;
  /** City tier this boss rules (1..MAX_CITIES). */
  tier: number;
  name: string;
  title: string;
  lore: string;
  /**
   * Accent color for the boss banner, as an `R G B` triple so callers can build
   * `rgb(var(--x) / alpha)` shades from a single token.
   */
  accent: string;
}

/**
 * The ten rulers, in city order. `tier` is derived from the position so the
 * table can never drift out of sync with the city count.
 */
export const CITY_BOSSES: readonly CityBoss[] = [
  {
    key: "varkos",
    name: "ורקוס",
    title: "שובר השערים",
    lore: "ענק משוריין שמנפץ שערי ערים במקבת אחת. הוא חונה על חורבות העיר הראשונה ודורש מס דמים מכל אימפריה שעולה לדרך.",
    accent: "196 92 48",
  },
  {
    key: "morgeth",
    name: "מורגהת",
    title: "אלמנת האפר",
    lore: "מכשפה עטופת רעלות פחם ששרפה את ממלכתה שלה. כל מי שמתקרב לחומותיה נושם אפר — והאפר זוכר את שמו.",
    accent: "168 108 214",
  },
  {
    key: "dragor",
    name: "דראגור",
    title: "בן הברזל",
    lore: "נולד בכבשן ומעולם לא הסיר את שריונו. חרב התליין שלו נעוצה באדמה, וסביבה קבורים כל מי שניסו להזיז אותה.",
    accent: "96 156 224",
  },
  {
    key: "serpina",
    name: "סרפינה",
    title: "לוחשת הרעל",
    lore: "מלכת המתנקשים של הביצות הירוקות. היא לא נלחמת בצבאות — היא מרעילה את בארותיהם ומחכה שהמצור ייגמר מעצמו.",
    accent: "62 200 140",
  },
  {
    key: "kharon",
    name: "קרון",
    title: "רועה השבויים",
    lore: "סוחר עבדים במסכת ארד ללא פה. כל שרשרת שכרוכה על זרועו הייתה פעם צבא שלם שחשב שהוא חזק מספיק.",
    accent: "205 150 70",
  },
  {
    key: "azrael",
    name: "אזראל",
    title: "נביא הלהבה",
    lore: "כוהן אש שפניו נמסו לתוך הלבה שהוא סוגד לה. הוא מטיף שכל אימפריה נועדה להישרף — ומקדים להגשים את הנבואה.",
    accent: "255 140 52",
  },
  {
    key: "tharos",
    name: "תארוס",
    title: "מצביא הלגיון השחור",
    lore: "מפקד הלגיון שלא הפסיד קרב מעולם. הוא לא בא לבזוז — הוא בא למחוק את שם האימפריה מכל מפה קיימת.",
    accent: "230 62 62",
  },
  {
    key: "rythen",
    name: "רית'ן",
    title: "מלך הצללים",
    lore: "אין לו גוף, רק שריון שממשיך לצעוד. חרמש הצל שלו חותך דרך חומות כאילו הן לא היו שם מעולם.",
    accent: "150 96 232",
  },
  {
    key: "volgaris",
    name: "וולגריס",
    title: "הר הפלדה",
    lore: "טיטאן מצור בגובה חומה, ששריונו בנוי משערי הערים שהפיל. הוא לא צועד מהר — הוא פשוט לא נעצר.",
    accent: "150 168 190",
  },
  {
    key: "nox",
    name: "נוקס",
    title: "קיסר הכתר השבור",
    lore: "הקיסר האפל הראשון, שיושב על כס שבור מאז שהעולם היה צעיר. מי שמפיל אותו יורש את האימפריום כולו.",
    accent: "228 195 90",
  },
].map((boss, index) => ({ ...boss, tier: index + 1 }));

/** The boss ruling a given city tier; clamped to the catalog's ends. */
export function bossForCity(cities: number): CityBoss {
  const tier = Math.min(MAX_CITIES, Math.max(1, Math.floor(cities)));
  return CITY_BOSSES[tier - 1];
}

export function bossByKey(key: string): CityBoss | undefined {
  return CITY_BOSSES.find((b) => b.key === key);
}

/**
 * Portrait path for a boss. JPEG, not PNG, for the same reason the hero class
 * portraits are: the raw 768×1024 renders are ~1.2 MB each, and ten of them
 * would put over 11 MB of art on a page every player loads.
 *
 * The banner draws a crest underlay behind this image, so a boss whose art has
 * not been generated yet degrades to a deliberate-looking plate rather than a
 * broken image.
 */
export function bossImage(key: string): string {
  return `/boss/${key}.jpg`;
}

/* ------------------------------ turn cost ------------------------------ */

/** Turns the first city's boss demands. */
export const BOSS_TURN_COST_BASE = 300;
/** Extra turns demanded by each city tier above the first. */
export const BOSS_TURN_COST_PER_CITY = 200;

/**
 * Turns spent on one run at the boss of `cities`: 300 in the first city, 500 in
 * the second, and so on up to 2,100 in the tenth. Spent whether the run wins or
 * loses — marching on a boss you cannot beat is its own punishment.
 */
export function bossTurnCost(cities: number): number {
  const tier = Math.min(MAX_CITIES, Math.max(1, Math.floor(cities)));
  return BOSS_TURN_COST_BASE + (tier - 1) * BOSS_TURN_COST_PER_CITY;
}

/* ------------------------------ power ------------------------------ */

/**
 * Attack power the first city's boss fields. Roughly what a player holds after
 * their first week: ~1,200 soldiers, or the same power bought as weapons (the
 * weapon table pays exactly 1 power per 10 gold at every tier).
 */
export const BOSS_BASE_POWER = 12_000;

/**
 * Power multiplier per city tier. Matches CITY_COST_TIER_MULTIPLIER, so the
 * boss keeps pace with the empire that founded the city it guards.
 */
export const BOSS_POWER_TIER_MULTIPLIER = 2.5;

/**
 * The boss's fixed battle power. Static by design: it is printed on the boss
 * banner, so a player always knows exactly how far off they are. An attack wins
 * when the attacker's real attack power (soldiers + attack weapons, times hero
 * and guild bonuses, plus guild aid) is strictly greater.
 */
export function bossPower(cities: number, powerMultiplier = 1): number {
  const tier = Math.min(MAX_CITIES, Math.max(1, Math.floor(cities)));
  return Math.round(
    BOSS_BASE_POWER * Math.pow(BOSS_POWER_TIER_MULTIPLIER, tier - 1) * powerMultiplier
  );
}

/* ------------------------------ casualties ------------------------------ */

/**
 * Soldiers lost. A repelled assault is mauled — the boss is not a player who
 * merely holds the wall. A win still costs, scaled by how close the fight was,
 * so overwhelming force is the safe way to farm and a squeaker is expensive.
 */
export const BOSS_LOSS_RATE_DEFEAT = 0.35;
export const BOSS_LOSS_RATE_VICTORY_MAX = 0.15;

/**
 * Fraction of the attacker's soldiers killed in the run. On a victory the rate
 * runs from ~0 (a crushing overmatch) up to BOSS_LOSS_RATE_VICTORY_MAX (a fight
 * decided by a hair); on a defeat it is the flat rout rate.
 */
export function bossSoldierLossRate(
  victory: boolean,
  attackerPower: number,
  bossPowerValue: number
): number {
  if (!victory) return BOSS_LOSS_RATE_DEFEAT;
  const total = attackerPower + bossPowerValue;
  const closeness =
    total > 0 ? Math.min(attackerPower, bossPowerValue) / total : 0;
  // closeness runs 0..0.5, so ×2 maps a dead-even fight to the full rate.
  return BOSS_LOSS_RATE_VICTORY_MAX * closeness * 2;
}

/* ------------------------------ rewards ------------------------------ */

export interface BossReward {
  gold: number;
  wood: number;
  iron: number;
  stone: number;
  /** Captives dragged home — they join the free mine-slave pool. */
  slaves: number;
}

/** Day-1, first-city haul. Every other tier and day is derived from this. */
export const BOSS_REWARD_BASE: BossReward = {
  gold: 50_000,
  wood: 30_000,
  iron: 25_000,
  stone: 25_000,
  slaves: 40,
};

/** Resource reward multiplier per city tier — the same curve as the power. */
export const BOSS_REWARD_TIER_MULTIPLIER = 2.4;

/**
 * Slaves grow on a gentler curve than resources: mine slaves feed uncapped
 * production, so a ×2.4-per-tier slave payout would compound into the economy
 * twice (more slaves × a higher city production multiplier).
 */
export const BOSS_SLAVE_TIER_MULTIPLIER = 1.6;

/**
 * Fraction of the base added per elapsed season day, so the haul stays relevant
 * to where the season actually is (the season pass uses the same idea at 0.25).
 * Held lower here because the tier multiplier already carries most of the
 * growth and the two compound.
 */
export const BOSS_REWARD_DAILY_GROWTH = 0.2;

function grow(base: number, tierMultiplier: number, tier: number, day: number): number {
  const seasonal = 1 + BOSS_REWARD_DAILY_GROWTH * (Math.max(1, day) - 1);
  return base * Math.pow(tierMultiplier, tier - 1) * seasonal;
}

/**
 * The haul for beating the boss of `cities` on season day `day`.
 * `multiplier` is the admin-tunable global scalar.
 */
export function bossReward(cities: number, day: number, multiplier = 1): BossReward {
  const tier = Math.min(MAX_CITIES, Math.max(1, Math.floor(cities)));
  const res = (base: number) =>
    Math.round((grow(base, BOSS_REWARD_TIER_MULTIPLIER, tier, day) * multiplier) / 100) * 100;
  return {
    gold: res(BOSS_REWARD_BASE.gold),
    wood: res(BOSS_REWARD_BASE.wood),
    iron: res(BOSS_REWARD_BASE.iron),
    stone: res(BOSS_REWARD_BASE.stone),
    slaves: Math.max(
      1,
      Math.round(
        grow(BOSS_REWARD_BASE.slaves, BOSS_SLAVE_TIER_MULTIPLIER, tier, day) * multiplier
      )
    ),
  };
}

/** The four storable resources of a reward, for iteration in the UI. */
export const BOSS_REWARD_RESOURCES: readonly StorableResource[] = [
  "gold",
  "wood",
  "iron",
  "stone",
];

/* ------------------------------ hero XP & loot ------------------------------ */

/**
 * Hero XP for felling a boss. Far above an ordinary attack win (which pays
 * `40 + defenderHeroLevel × 10` before multipliers) because the run costs 30×
 * the turns — but flat per tier, so it cannot be farmed by picking a soft
 * target the way player attacks can.
 */
export const BOSS_HERO_XP_BASE = 400;
export const BOSS_HERO_XP_PER_TIER = 250;

export function bossHeroXp(cities: number): number {
  const tier = Math.min(MAX_CITIES, Math.max(1, Math.floor(cities)));
  return BOSS_HERO_XP_BASE + (tier - 1) * BOSS_HERO_XP_PER_TIER;
}

/** A failed run teaches the hero nothing — only a felled boss pays XP. */
export const BOSS_HERO_XP_DEFEAT = 0;

/**
 * Rarity floor of the guaranteed drop a felled boss leaves behind. The roll
 * still uses the normal rarity odds (`rollGuaranteedItem`), but anything below
 * this floor is re-read as the floor — a boss never drops junk.
 */
export const BOSS_ITEM_RARITY_FLOOR: HeroRarity = "RARE";

/* ------------------------------ cadence ------------------------------ */

/**
 * Victories allowed between one daily update and the next. The boss "licks its
 * wounds" until the next update, which is what stops a player who banked turns
 * for a fortnight (turn gain is uncapped — see applyPendingUpdates) from
 * cashing the whole stockpile into one afternoon of boss farming. Defeats do
 * not consume the allowance: losing already cost the turns and a third of the
 * army.
 */
export const BOSS_VICTORIES_PER_CYCLE = 1;
