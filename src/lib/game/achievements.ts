import type { IconName } from "@/components/ui/Icon";
import {
  MAX_CITIES,
  MINE_MAX_LEVEL,
  citizenGrowthMaxLevel,
  citizensPerDailyUpdate,
} from "./constants";
import { HERO_MAX_LEVEL } from "./hero";

/**
 * Achievements: a one-off (never resetting) reward ladder covering the whole
 * arc of an empire, from "you launched your first attack" to "you hold all ten
 * cities and every weapon in the game".
 *
 * Four rules shape the design:
 *
 * 1. **Progress is derived, never stored.** Each entry declares its condition
 *    as a function over an `AchievementStats` snapshot that
 *    `src/server/achievementState.ts` assembles from tables the game already
 *    writes. No gameplay action has to be instrumented to keep a counter in
 *    sync, and a goal can be retuned here without a database migration. The
 *    only row ever written is the claim receipt (`EmpireAchievement`).
 *
 * 2. **Claiming is explicit.** Reaching a goal unlocks the reward; the player
 *    still presses collect. That keeps every payout on one guarded path
 *    (receipt insert + credit in one transaction) instead of firing from a
 *    hundred unrelated call sites.
 *
 * 3. **Ladders, not one-offs.** Most milestones come as a `chain` of tiers
 *    sharing one stat — first attack, 10, 50, 100, 500, 1,000 — so there is
 *    always a next rung in sight and the reward curve can grow with it. The
 *    top rung of a chain is deliberately pinned to the game's real ceiling
 *    (MAX_CITIES, HERO_MAX_LEVEL, MINE_MAX_LEVEL, WEAPON_TOTAL) so "finish the
 *    game" and "finish the ladder" are the same act.
 *
 * 4. **Diamonds are rationed.** The season pass excludes diamonds outright
 *    because it repeats twice a day and would undercut the real-money store
 *    (see seasonPass.ts). Achievements fire once per empire *ever*, so a
 *    budget is affordable — but it is confined to the handful of capstones
 *    below, totalling ACHIEVEMENT_DIAMOND_BUDGET across a 100% run. That is
 *    roughly one premium season pass for completing the entire game.
 */

/* ------------------------------ rewards ------------------------------ */

/** Every resource an achievement may pay out. Keys match RESOURCE_ICON. */
export type AchievementRewardKind =
  | "gold"
  | "wood"
  | "iron"
  | "stone"
  | "diamonds"
  | "citizens"
  | "turns";

export const ACHIEVEMENT_REWARD_LABEL: Record<AchievementRewardKind, string> = {
  gold: "זהב",
  wood: "עץ",
  iron: "ברזל",
  stone: "אבן",
  diamonds: "יהלומים",
  citizens: "אזרחים",
  turns: "תורות",
};

/** Canonical display order for a merged payout — resources, then the specials. */
export const ACHIEVEMENT_REWARD_ORDER: readonly AchievementRewardKind[] = [
  "gold",
  "wood",
  "iron",
  "stone",
  "citizens",
  "turns",
  "diamonds",
];

/** One line of a collect summary: everything of a single kind, added up. */
export interface AchievementRewardTotal {
  kind: AchievementRewardKind;
  amount: number;
}

/**
 * Merge a batch of rewards into one total per resource.
 *
 * Collecting fifty achievements at once otherwise reads as fifty fragments —
 * "5,000 עץ · 40,000 עץ · 80,000 עץ · …" — which is a wall of text that hides
 * the only thing the player wants to know. One line per resource, in a fixed
 * order, says the same thing in a glance.
 */
export function mergeRewards(
  rewards: readonly { kind: AchievementRewardKind; amount: number }[]
): AchievementRewardTotal[] {
  const totals = new Map<AchievementRewardKind, number>();
  for (const r of rewards) {
    totals.set(r.kind, (totals.get(r.kind) ?? 0) + r.amount);
  }
  return ACHIEVEMENT_REWARD_ORDER.filter((k) => totals.has(k)).map((kind) => ({
    kind,
    amount: totals.get(kind)!,
  }));
}

/**
 * Total diamonds the whole ladder can ever pay one empire.
 *
 * Keep this equal to the sum of every `diamonds` reward below — it had drifted
 * to 1,700 against an actual 2,000, and a payout budget nobody can trust is
 * worse than no budget at all. Re-add it up when you add or retune a diamond
 * capstone.
 */
export const ACHIEVEMENT_DIAMOND_BUDGET = 2_000;

/* ------------------------------ categories ------------------------------ */

export type AchievementCategory =
  | "war"
  | "espionage"
  | "hero"
  | "economy"
  | "empire"
  | "legacy";

export const ACHIEVEMENT_CATEGORY_META: Record<
  AchievementCategory,
  { label: string; icon: IconName }
> = {
  war: { label: "מלחמה", icon: "attack" },
  espionage: { label: "ריגול", icon: "spy" },
  hero: { label: "גיבור", icon: "hero" },
  economy: { label: "כלכלה", icon: "gold" },
  empire: { label: "אימפריה", icon: "base" },
  legacy: { label: "תהילה", icon: "crown" },
};

/** Display order of the category filter and of the grouped lists. */
export const ACHIEVEMENT_CATEGORIES: readonly AchievementCategory[] = [
  "war",
  "espionage",
  "hero",
  "economy",
  "empire",
  "legacy",
];

/* ------------------------------ stats ------------------------------ */

/**
 * Everything the catalog can test against, gathered once per request by
 * `gatherAchievementStats`. Counters are lifetime totals for the empire;
 * levels and balances are current values.
 *
 * Adding a field here means adding it to the SQL snapshot in
 * src/server/achievementState.ts — there is no other producer.
 */
export interface AchievementStats {
  /* --- war --- */
  /** Attacks this empire launched, win or lose. */
  attacksLaunched: number;
  /** Attacks this empire launched and won. */
  attackWins: number;
  /** Attacks against this empire that it repelled. */
  defenseWins: number;
  /** Enemy soldiers killed, attacking and defending. */
  soldiersSlain: number;
  /** Enemy soldiers captured into the mine-slave pool by winning attacks. */
  soldiersEnslaved: number;
  /** Gold taken from other empires in won attacks. */
  goldPlundered: number;

  /* --- espionage --- */
  /** Spy missions this empire launched. */
  spyMissions: number;
  /** Spy missions that came back with a report. */
  spySuccesses: number;

  /* --- hero --- */
  heroLevel: number;
  /** Times the hero hit the cap and was reset (prestige). */
  heroResets: number;
  /** Hero items owned, equipped or in the bag. */
  heroItems: number;
  epicItems: number;
  legendaryItems: number;
  /** Items currently equipped — 9 is a full paperdoll. */
  equippedItems: number;

  /* --- economy --- */
  gold: number;
  wood: number;
  iron: number;
  stone: number;
  diamonds: number;
  turns: number;
  /** Gold sitting in the bank right now. */
  bankBalance: number;
  /** Bank DEPOSIT transactions made. */
  bankDeposits: number;
  /** Bank INTEREST payouts received. */
  interestPayments: number;
  /** Production buildings raised above level 0 — mines start unbuilt. */
  minesBuilt: number;
  /** Lowest level among the four mines: the "all mines at N" measure. */
  minMineLevel: number;
  /** Highest level of any single mine. */
  maxMineLevel: number;
  /** Lowest level among the four warehouses. */
  minStorageLevel: number;

  /* --- empire --- */
  cities: number;
  /** Level of the CITIZEN_GROWTH upgrade (starts at 1). */
  citizenGrowthLevel: number;
  /** Lowest level across all empire upgrades: the "all upgrades at N" measure. */
  minUpgradeLevel: number;
  soldiers: number;
  spies: number;
  mineSlaves: number;
  /** Distinct weapon models owned, per category and overall (max 30 / 90). */
  attackWeapons: number;
  defenseWeapons: number;
  spyWeapons: number;
  distinctWeapons: number;
  /** Total weapon units held across every model. */
  totalWeapons: number;
  /** Lowest unlocked tier across the three categories. */
  minUnlockedTier: number;

  /* --- legacy --- */
  inGuild: boolean;
  isGuildLeader: boolean;
  /** City-boss runs won. */
  bossWins: number;
  /** Distinct city tiers whose boss has been felled (max MAX_CITIES). */
  distinctBossesBeaten: number;
  miniGameWins: number;
  /** Player-to-player letters sent. */
  messagesSent: number;
  /**
   * Rank 1 of the city bucket this empire competes in. Computing it costs an
   * O(bucket) power scan, so the gatherer only fills it in while the rank
   * achievement is still unclaimed — see `needsRankScan`.
   */
  isRankOne: boolean;
}

/* ------------------------------ definitions ------------------------------ */

export interface AchievementDefinition {
  /** Stable id persisted in EmpireAchievement.key — never reuse or rename. */
  key: string;
  category: AchievementCategory;
  name: string;
  /** One-line hint telling the player how to earn it. */
  hint: string;
  icon: IconName;
  reward: { kind: AchievementRewardKind; amount: number };
  /** Value of `progress` that unlocks the reward. */
  goal: number;
  /** Current standing against `goal`; the view model clamps it for display. */
  progress: (s: AchievementStats) => number;
}

type Reward = [AchievementRewardKind, number];

/** One rung of a chain: the goal, its reward, and the wording for both. */
type Rung = {
  goal: number;
  reward: Reward;
  /** Overrides the generated name — used for the first and last rungs. */
  name?: string;
  hint?: string;
};

/**
 * Build a tiered chain of achievements sharing one stat.
 *
 * Chains are why this file stays readable at ~90 entries: the shape of
 * "do more of X" is declared once and the rungs are just numbers. Keys are
 * `${prefix}_${goal}` so a rung can be retuned without orphaning a claim — the
 * goal is part of the identity, and changing a goal deliberately mints a new
 * achievement rather than silently re-locking a collected one.
 */
function chain(
  prefix: string,
  category: AchievementCategory,
  icon: IconName,
  stat: (s: AchievementStats) => number,
  label: (goal: number) => string,
  hint: (goal: number) => string,
  rungs: readonly Rung[]
): AchievementDefinition[] {
  return rungs.map((r) => ({
    key: `${prefix}_${r.goal}`,
    category,
    icon,
    name: r.name ?? label(r.goal),
    hint: r.hint ?? hint(r.goal),
    reward: { kind: r.reward[0], amount: r.reward[1] },
    goal: r.goal,
    progress: stat,
  }));
}

/** A single milestone that has no ladder around it. */
function one(
  key: string,
  category: AchievementCategory,
  icon: IconName,
  name: string,
  hint: string,
  goal: number,
  reward: Reward,
  progress: (s: AchievementStats) => number
): AchievementDefinition {
  return {
    key,
    category,
    icon,
    name,
    hint,
    goal,
    reward: { kind: reward[0], amount: reward[1] },
    progress,
  };
}

const he = (n: number) => n.toLocaleString("he-IL");

/** Total distinct weapon models in the game — 30 tiers × 3 categories. */
const WEAPON_TOTAL = 90;

/**
 * The absolute ceiling of the citizen-intake upgrade: 10 levels per city, so
 * only an empire holding all ten cities can reach it. Pays 520 a day.
 */
const CITIZEN_GROWTH_CAP = citizenGrowthMaxLevel(MAX_CITIES);

/**
 * The level that first pays a round 500 citizens per daily update.
 *
 * Derived rather than written as `96`, so it follows if `citizensPerDailyUpdate`
 * is ever retuned. It is four levels short of the cap — the two are different
 * milestones and the base-screen board deliberately shows this one.
 */
const CITIZEN_GROWTH_500 = (() => {
  for (let level = 1; level <= CITIZEN_GROWTH_CAP; level += 1) {
    if (citizensPerDailyUpdate(level) >= 500) return level;
  }
  return CITIZEN_GROWTH_CAP;
})();

/**
 * The one achievement whose condition costs a full power scan of the city
 * bucket, so the gatherer skips it once collected (see `needsRankScan`).
 */
export const RANK_ONE_KEY = "rank_one";

/* ------------------------------ the ladder ------------------------------ */

const WAR: AchievementDefinition[] = [
  ...chain(
    "attacks",
    "war",
    "attack",
    (s) => s.attacksLaunched,
    (g) => `${he(g)} תקיפות`,
    (g) => `פתח ב-${he(g)} תקיפות, בניצחון או בהפסד`,
    [
      { goal: 1, reward: ["citizens", 40], name: "תקיפה ראשונה", hint: "תקוף אימפריה אחת מהדירוג" },
      { goal: 10, reward: ["turns", 30] },
      { goal: 50, reward: ["turns", 80] },
      { goal: 100, reward: ["gold", 60_000] },
      { goal: 250, reward: ["turns", 200] },
      { goal: 500, reward: ["gold", 400_000] },
      { goal: 1_000, reward: ["turns", 500], name: "אלף תקיפות", hint: "פתח ב-1,000 תקיפות — מצביא אמיתי" },
    ]
  ),
  ...chain(
    "wins",
    "war",
    "rankings",
    (s) => s.attackWins,
    (g) => `${he(g)} ניצחונות`,
    (g) => `נצח ב-${he(g)} תקיפות`,
    [
      { goal: 1, reward: ["citizens", 40], name: "ניצחון ראשון", hint: "נצח בתקיפה אחת" },
      { goal: 10, reward: ["turns", 60] },
      { goal: 50, reward: ["gold", 120_000] },
      { goal: 100, reward: ["turns", 250] },
      { goal: 250, reward: ["iron", 500_000] },
      { goal: 500, reward: ["turns", 600] },
    ]
  ),
  ...chain(
    "defense",
    "war",
    "shield",
    (s) => s.defenseWins,
    (g) => `${he(g)} הדיפות`,
    (g) => `הדוף ${he(g)} תקיפות על האימפריה שלך`,
    [
      { goal: 1, reward: ["stone", 8_000], name: "חומה ראשונה", hint: "הדוף תקיפה אחת על האימפריה שלך" },
      { goal: 10, reward: ["stone", 60_000] },
      { goal: 50, reward: ["stone", 300_000] },
      { goal: 150, reward: ["turns", 350] },
    ]
  ),
  ...chain(
    "slain",
    "war",
    "army",
    (s) => s.soldiersSlain,
    (g) => `${he(g)} חיילי אויב`,
    (g) => `חסל ${he(g)} חיילי אויב בקרב`,
    [
      { goal: 100, reward: ["citizens", 50] },
      { goal: 1_000, reward: ["iron", 40_000] },
      { goal: 10_000, reward: ["iron", 250_000] },
      { goal: 100_000, reward: ["turns", 400], name: "קוצר הנשמות", hint: "חסל 100,000 חיילי אויב" },
    ]
  ),
  ...chain(
    "enslaved",
    "war",
    "citizens",
    (s) => s.soldiersEnslaved,
    (g) => `${he(g)} שבויים`,
    (g) => `שבה ${he(g)} חיילי אויב לעבדות מכרות`,
    [
      { goal: 10, reward: ["citizens", 50] },
      { goal: 100, reward: ["citizens", 120] },
      { goal: 1_000, reward: ["gold", 300_000] },
    ]
  ),
  ...chain(
    "plunder",
    "war",
    "gold",
    (s) => s.goldPlundered,
    (g) => `שוד ${he(g)} זהב`,
    (g) => `שדוד ${he(g)} זהב מאימפריות אחרות`,
    [
      { goal: 10_000, reward: ["gold", 10_000] },
      { goal: 100_000, reward: ["gold", 80_000] },
      { goal: 1_000_000, reward: ["turns", 200] },
      { goal: 10_000_000, reward: ["turns", 500], name: "מלך השודדים", hint: "שדוד 10,000,000 זהב מאימפריות אחרות" },
    ]
  ),
];

const ESPIONAGE: AchievementDefinition[] = [
  ...chain(
    "spy",
    "espionage",
    "spy",
    (s) => s.spyMissions,
    (g) => `${he(g)} משימות ריגול`,
    (g) => `שלח ${he(g)} משימות ריגול`,
    [
      { goal: 1, reward: ["citizens", 40], name: "ריגול ראשון", hint: "שלח מרגלים לאימפריה אחת" },
      { goal: 10, reward: ["turns", 30] },
      { goal: 50, reward: ["turns", 80] },
      { goal: 200, reward: ["gold", 150_000] },
      { goal: 500, reward: ["turns", 300] },
    ]
  ),
  ...chain(
    "spywin",
    "espionage",
    "reports",
    (s) => s.spySuccesses,
    (g) => `${he(g)} דוחות ריגול`,
    (g) => `חזור עם ${he(g)} דוחות ריגול מוצלחים`,
    [
      { goal: 1, reward: ["citizens", 40], name: "דוח ראשון", hint: "חזור עם דוח ריגול מוצלח אחד" },
      { goal: 25, reward: ["turns", 60] },
      { goal: 100, reward: ["turns", 150] },
      { goal: 300, reward: ["turns", 400], name: "צל האימפריה", hint: "חזור עם 300 דוחות ריגול מוצלחים" },
    ]
  ),
  ...chain(
    "spies",
    "espionage",
    "spy",
    (s) => s.spies,
    (g) => `${he(g)} מרגלים`,
    (g) => `אמן ${he(g)} מרגלים`,
    [
      { goal: 100, reward: ["citizens", 60] },
      { goal: 1_000, reward: ["gold", 200_000] },
      { goal: 5_000, reward: ["turns", 300] },
    ]
  ),
];

const HERO: AchievementDefinition[] = [
  ...chain(
    "herolvl",
    "hero",
    "hero",
    (s) => s.heroLevel,
    (g) => `גיבור ברמה ${he(g)}`,
    (g) => `העלה את הגיבור שלך לרמה ${he(g)}`,
    [
      { goal: 5, reward: ["citizens", 50] },
      { goal: 10, reward: ["turns", 60] },
      { goal: 25, reward: ["turns", 120] },
      { goal: 50, reward: ["gold", 250_000] },
      { goal: 75, reward: ["turns", 300] },
      {
        goal: HERO_MAX_LEVEL,
        reward: ["diamonds", 250],
        name: "גיבור בשיא",
        hint: `העלה את הגיבור שלך לרמה ${HERO_MAX_LEVEL} — הרמה המרבית`,
      },
    ]
  ),
  ...chain(
    "heroreset",
    "hero",
    "spark",
    (s) => s.heroResets,
    (g) => `${he(g)} איפוסי גיבור`,
    (g) => `אפס את הגיבור ${he(g)} פעמים לאחר שהגיע לשיא`,
    [
      {
        goal: 1,
        reward: ["diamonds", 100],
        name: "לידה מחדש",
        hint: "אפס את הגיבור בפעם הראשונה לאחר שהגיע לשיא",
      },
      { goal: 3, reward: ["turns", 250] },
      { goal: 5, reward: ["turns", 500] },
    ]
  ),
  ...chain(
    "items",
    "hero",
    "shop",
    (s) => s.heroItems,
    (g) => `${he(g)} פריטי ציוד`,
    (g) => `אסוף ${he(g)} פריטי ציוד לגיבור`,
    [
      {
        goal: 1,
        reward: ["diamonds", 50],
        name: "למצוא חפץ ראשון",
        hint: "נצח בתקיפה וזכה בציוד לגיבור",
      },
      { goal: 10, reward: ["iron", 40_000] },
      { goal: 25, reward: ["iron", 150_000] },
      { goal: 50, reward: ["turns", 250] },
    ]
  ),
  ...chain(
    "epic",
    "hero",
    "potion",
    (s) => s.epicItems,
    (g) => `${he(g)} פריטים אפיים`,
    (g) => `זכה ב-${he(g)} פריטים בדרגת נדירות אפי`,
    [
      { goal: 1, reward: ["turns", 60], name: "חפץ אפי", hint: "זכה בפריט אחד בדרגת נדירות אפי" },
      { goal: 10, reward: ["turns", 200] },
    ]
  ),
  ...chain(
    "legendary",
    "hero",
    "spark",
    (s) => s.legendaryItems,
    (g) => `${he(g)} פריטים אגדיים`,
    (g) => `זכה ב-${he(g)} פריטים בדרגת נדירות אגדי`,
    [
      {
        goal: 1,
        reward: ["diamonds", 150],
        name: "חפץ אגדי",
        hint: "זכה בפריט אחד בדרגת נדירות אגדי",
      },
      { goal: 5, reward: ["turns", 300] },
      { goal: 10, reward: ["turns", 600] },
    ]
  ),
  one(
    "full_gear",
    "hero",
    "shield",
    "ציוד מלא",
    "צייד את הגיבור בכל תשעת המשבצות בו-זמנית",
    9,
    ["diamonds", 100],
    (s) => s.equippedItems
  ),
];

const ECONOMY: AchievementDefinition[] = [
  ...chain(
    "mines",
    "economy",
    "mine",
    (s) => s.minesBuilt,
    (g) => `${he(g)} מכרות`,
    (g) => `העלה ${he(g)} מכרות לרמה 1 ומעלה`,
    [
      { goal: 1, reward: ["wood", 5_000], name: "לבנות מכרה", hint: "שדרג מכרה אחד מרמה 0" },
      { goal: 4, reward: ["wood", 40_000], name: "לבנות את כל המכרות", hint: "העלה את ארבעת המכרות לרמה 1 ומעלה" },
    ]
  ),
  ...chain(
    "minelvl",
    "economy",
    "factory",
    (s) => s.minMineLevel,
    (g) => `כל המכרות ברמה ${he(g)}`,
    (g) => `שדרג את ארבעת המכרות לרמה ${he(g)} ומעלה`,
    [
      { goal: 10, reward: ["wood", 80_000] },
      { goal: 25, reward: ["wood", 300_000] },
      { goal: 50, reward: ["turns", 250] },
      { goal: 100, reward: ["turns", 500] },
      {
        goal: MINE_MAX_LEVEL,
        reward: ["diamonds", 150],
        name: "תעשייה בשיא",
        hint: `שדרג את ארבעת המכרות לרמה ${he(MINE_MAX_LEVEL)} — הרמה המרבית`,
      },
    ]
  ),
  ...chain(
    "storage",
    "economy",
    "storage",
    (s) => s.minStorageLevel,
    (g) => `כל המחסנים ברמה ${he(g)}`,
    (g) => `שדרג את ארבעת המחסנים לרמה ${he(g)} ומעלה`,
    [
      { goal: 5, reward: ["stone", 40_000] },
      { goal: 10, reward: ["stone", 150_000] },
      { goal: 25, reward: ["turns", 300] },
    ]
  ),
  ...chain(
    "gold",
    "economy",
    "gold",
    (s) => s.gold,
    (g) => `${he(g)} זהב`,
    (g) => `החזק ${he(g)} זהב בבת אחת`,
    [
      { goal: 1_000_000, reward: ["turns", 150], name: "מיליונר ראשון", hint: "החזק 1,000,000 זהב בבת אחת" },
      { goal: 10_000_000, reward: ["turns", 300] },
      { goal: 100_000_000, reward: ["turns", 600], name: "הון עתק", hint: "החזק 100,000,000 זהב בבת אחת" },
    ]
  ),
  ...chain(
    "deposits",
    "economy",
    "bank",
    (s) => s.bankDeposits,
    (g) => `${he(g)} הפקדות`,
    (g) => `בצע ${he(g)} הפקדות בבנק`,
    [
      { goal: 1, reward: ["gold", 10_000], name: "הפקדה ראשונה בבנק", hint: "הפקד זהב בבנק פעם אחת" },
      { goal: 25, reward: ["gold", 80_000] },
      { goal: 100, reward: ["gold", 400_000] },
    ]
  ),
  ...chain(
    "bankbal",
    "economy",
    "bank",
    (s) => s.bankBalance,
    (g) => `${he(g)} זהב בבנק`,
    (g) => `החזק ${he(g)} זהב בחשבון הבנק`,
    [
      { goal: 100_000, reward: ["gold", 25_000] },
      { goal: 1_000_000, reward: ["turns", 150] },
      { goal: 10_000_000, reward: ["turns", 400] },
    ]
  ),
  ...chain(
    "interest",
    "economy",
    "bank",
    (s) => s.interestPayments,
    (g) => `${he(g)} תשלומי ריבית`,
    (g) => `קבל ${he(g)} תשלומי ריבית מהבנק`,
    [
      { goal: 1, reward: ["gold", 15_000], name: "ריבית ראשונה", hint: "קבל תשלום ריבית אחד מהבנק" },
      { goal: 30, reward: ["gold", 200_000] },
    ]
  ),
  one(
    "hoarder",
    "economy",
    "storage",
    "מחסנים מלאים",
    "החזק מיליון עץ, מיליון ברזל ומיליון אבן בו-זמנית",
    3,
    ["turns", 350],
    (s) =>
      (s.wood >= 1_000_000 ? 1 : 0) +
      (s.iron >= 1_000_000 ? 1 : 0) +
      (s.stone >= 1_000_000 ? 1 : 0)
  ),
];

const EMPIRE: AchievementDefinition[] = [
  ...chain(
    "cities",
    "empire",
    "base",
    (s) => s.cities,
    (g) => `${he(g)} ערים`,
    (g) => `ייסד אימפריה בת ${he(g)} ערים`,
    [
      { goal: 2, reward: ["gold", 50_000], name: "לעלות עיר", hint: "ייסד עיר שנייה" },
      { goal: 3, reward: ["gold", 150_000] },
      { goal: 5, reward: ["turns", 250] },
      { goal: 7, reward: ["turns", 400] },
      {
        goal: MAX_CITIES,
        reward: ["diamonds", 300],
        name: "קיסרות",
        hint: `החזק את כל ${he(MAX_CITIES)} הערים — האימפריה המלאה`,
      },
    ]
  ),
  ...chain(
    "citizenup",
    "empire",
    "citizens",
    (s) => s.citizenGrowthLevel,
    (g) => `קבלת מגויסים ${he(g)}`,
    (g) => `שדרג את "קבלת מגויסים" לרמה ${he(g)}`,
    [
      { goal: 2, reward: ["citizens", 60], name: "לשדרג קבלת מגויסים", hint: 'שדרג את "קבלת מגויסים" לרמה 2' },
      { goal: 5, reward: ["citizens", 150] },
      { goal: 10, reward: ["citizens", 300] },
      // The round number the design aims at, and the rung the base-screen board
      // draws (see GLORY_KEYS). 500 a day is level 96, not the cap — the cap is
      // four levels further on and pays 520.
      {
        goal: CITIZEN_GROWTH_500,
        reward: ["citizens", 1_000],
        name: "500 אזרחים ביום",
        hint: `שדרג את "קבלת מגויסים" לרמה ${he(
          CITIZEN_GROWTH_500
        )} — 500 אזרחים בכל עדכון יומי`,
      },
      // Rule 3: a chain's top rung is pinned to the real ceiling. This one
      // stopped at 10 while the upgrade actually runs to 10 levels *per city*,
      // so the ladder ended a tenth of the way up. The cap needs all ten cities,
      // which makes it one of the last things in the game to finish.
      {
        goal: CITIZEN_GROWTH_CAP,
        reward: ["citizens", 1_500],
        name: "עיר שוקקת",
        hint: `שדרג את "קבלת מגויסים" לרמה ${he(CITIZEN_GROWTH_CAP)} — ${he(
          citizensPerDailyUpdate(CITIZEN_GROWTH_CAP)
        )} אזרחים בכל עדכון יומי`,
      },
    ]
  ),
  ...chain(
    "upgrades",
    "empire",
    "upgrades",
    (s) => s.minUpgradeLevel,
    (g) => `כל השדרוגים ברמה ${he(g)}`,
    (g) => `העלה כל אחד משדרוגי האימפריה לרמה ${he(g)} ומעלה`,
    [
      { goal: 2, reward: ["gold", 60_000] },
      { goal: 3, reward: ["gold", 250_000] },
      {
        goal: 5,
        reward: ["diamonds", 150],
        name: "אימפריה משודרגת",
        hint: "העלה כל אחד משדרוגי האימפריה לרמה 5 ומעלה",
      },
    ]
  ),
  ...chain(
    "army",
    "empire",
    "army",
    (s) => s.soldiers,
    (g) => `צבא של ${he(g)}`,
    (g) => `אמן ${he(g)} חיילים`,
    [
      { goal: 1_000, reward: ["turns", 100] },
      { goal: 10_000, reward: ["iron", 300_000] },
      { goal: 50_000, reward: ["turns", 350] },
      { goal: 100_000, reward: ["turns", 700], name: "צבא אין-סופי", hint: "אמן 100,000 חיילים" },
    ]
  ),
  ...chain(
    "slaves",
    "empire",
    "mine",
    (s) => s.mineSlaves,
    (g) => `${he(g)} עבדי מכרות`,
    (g) => `החזק ${he(g)} עבדי מכרות`,
    [
      { goal: 100, reward: ["wood", 30_000] },
      { goal: 1_000, reward: ["wood", 200_000] },
      { goal: 10_000, reward: ["turns", 400] },
    ]
  ),
  one(
    "attack_weapon",
    "empire",
    "attack",
    "לקנות נשק התקפה",
    "רכוש כלי נשק אחד מקטגוריית התקפה",
    1,
    ["turns", 25],
    (s) => s.attackWeapons
  ),
  one(
    "defense_weapon",
    "empire",
    "shield",
    "לקנות נשק הגנה",
    "רכוש כלי נשק אחד מקטגוריית הגנה",
    1,
    ["turns", 25],
    (s) => s.defenseWeapons
  ),
  one(
    "spy_weapon",
    "empire",
    "spy",
    "לקנות נשק ריגול",
    "רכוש כלי נשק אחד מקטגוריית ריגול",
    1,
    ["turns", 25],
    (s) => s.spyWeapons
  ),
  ...chain(
    "arsenal",
    "empire",
    "factory",
    (s) => s.distinctWeapons,
    (g) => `${he(g)} דגמי נשק`,
    (g) => `החזק ${he(g)} דגמי נשק שונים`,
    [
      { goal: 10, reward: ["iron", 50_000] },
      { goal: 30, reward: ["iron", 250_000] },
      { goal: 60, reward: ["turns", 400] },
      {
        goal: WEAPON_TOTAL,
        reward: ["diamonds", 200],
        name: "נשקייה מושלמת",
        hint: `החזק את כל ${he(WEAPON_TOTAL)} דגמי הנשק במשחק`,
      },
    ]
  ),
  ...chain(
    "stockpile",
    "empire",
    "factory",
    (s) => s.totalWeapons,
    (g) => `${he(g)} כלי נשק`,
    (g) => `החזק ${he(g)} כלי נשק בסך הכל`,
    [
      { goal: 100, reward: ["iron", 30_000] },
      { goal: 1_000, reward: ["iron", 200_000] },
      { goal: 10_000, reward: ["turns", 450] },
    ]
  ),
  ...chain(
    "unlocks",
    "empire",
    "upgrades",
    (s) => s.minUnlockedTier,
    (g) => `דרגת נשק ${he(g)} בכל הקטגוריות`,
    (g) => `פתח את דרגה ${he(g)} בשלוש קטגוריות הנשק`,
    [
      { goal: 10, reward: ["iron", 80_000] },
      { goal: 20, reward: ["turns", 250] },
      { goal: 30, reward: ["turns", 600], name: "כל הדרגות פתוחות", hint: "פתח את דרגה 30 בשלוש קטגוריות הנשק" },
    ]
  ),
];

const LEGACY: AchievementDefinition[] = [
  one(
    "guild_member",
    "legacy",
    "guild",
    "להצטרף לגילדה",
    "הצטרף לגילדה קיימת או הקם אחת",
    1,
    ["stone", 15_000],
    (s) => (s.inGuild ? 1 : 0)
  ),
  one(
    "guild_leader",
    "legacy",
    "crown",
    "מנהיג גילדה",
    "הקם גילדה משלך והובל אותה",
    1,
    ["stone", 60_000],
    (s) => (s.isGuildLeader ? 1 : 0)
  ),
  ...chain(
    "boss",
    "legacy",
    "crown",
    (s) => s.bossWins,
    (g) => `${he(g)} ניצחונות על בוסים`,
    (g) => `נצח את בוס העיר ${he(g)} פעמים`,
    [
      { goal: 1, reward: ["iron", 30_000], name: "להביס את בוס העיר", hint: "נצח את הבוס של העיר שלך" },
      { goal: 5, reward: ["iron", 120_000] },
      { goal: 25, reward: ["turns", 300] },
      { goal: 100, reward: ["turns", 700] },
    ]
  ),
  one(
    "all_bosses",
    "legacy",
    "crown",
    "צייד העריצים",
    `הבס את הבוסים של כל ${he(MAX_CITIES)} דרגות הערים`,
    MAX_CITIES,
    ["diamonds", 250],
    (s) => s.distinctBossesBeaten
  ),
  ...chain(
    "minigame",
    "legacy",
    "dice",
    (s) => s.miniGameWins,
    (g) => `${he(g)} ניצחונות במיני-משחק`,
    (g) => `נצח ${he(g)} פעמים במיני-משחק`,
    [
      { goal: 1, reward: ["citizens", 50], name: "ניצחון ראשון במיני-משחק", hint: "נצח פעם אחת במיני-משחק" },
      { goal: 10, reward: ["turns", 120] },
      { goal: 50, reward: ["turns", 400] },
    ]
  ),
  ...chain(
    "letters",
    "legacy",
    "messages",
    (s) => s.messagesSent,
    (g) => `${he(g)} מכתבים`,
    (g) => `שלח ${he(g)} מכתבים לשחקנים אחרים`,
    [
      { goal: 1, reward: ["citizens", 30], name: "מכתב ראשון", hint: "שלח מכתב לשחקן אחר" },
      { goal: 25, reward: ["turns", 100] },
    ]
  ),
  one(
    RANK_ONE_KEY,
    "legacy",
    "crown",
    "לכבוש מקום ראשון בדירוג",
    "היה מספר 1 בדירוג העיר שלך",
    1,
    ["diamonds", 300],
    (s) => (s.isRankOne ? 1 : 0)
  ),
];

/**
 * Display order is progression order: the opening tutorial beats first, the
 * long grinds last. Within a category the chains stay in the order declared.
 */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  ...WAR,
  ...ESPIONAGE,
  ...HERO,
  ...ECONOMY,
  ...EMPIRE,
  ...LEGACY,
];

export const ACHIEVEMENT_BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

/**
 * Whether the caller still has to run the expensive rank scan: only when the
 * rank-1 achievement exists in the catalog and has not been collected yet.
 * Once collected it stays collected, so the scan is pure waste.
 */
export function needsRankScan(claimedKeys: ReadonlySet<string>): boolean {
  return ACHIEVEMENT_BY_KEY.has(RANK_ONE_KEY) && !claimedKeys.has(RANK_ONE_KEY);
}

/* ------------------------------ view model ------------------------------ */

const heNum = (n: number) => Math.round(n).toLocaleString("he-IL");

/** One row as the achievements screen renders it. */
export interface AchievementView {
  key: string;
  category: AchievementCategory;
  name: string;
  hint: string;
  icon: IconName;
  /** e.g. "40 אזרחים" — pre-formatted so the client stays presentational. */
  rewardLabel: string;
  rewardKind: AchievementRewardKind;
  rewardAmount: number;
  goal: number;
  /** Clamped to `goal`, so a 5,000,000-gold player still reads 1,000,000. */
  progress: number;
  unlocked: boolean;
  claimed: boolean;
}

export interface AchievementsState {
  items: AchievementView[];
  /** Unlocked and not yet collected — drives the collect button and badges. */
  collectable: number;
  claimed: number;
  total: number;
}

export function achievementRewardLabel(a: AchievementDefinition): string {
  return `${heNum(a.reward.amount)} ${ACHIEVEMENT_REWARD_LABEL[a.reward.kind]}`;
}

/* ------------------------------ hall of glory ------------------------------ */

/**
 * The capstones — five conditions pinned to the game's actual ceilings, shown
 * as decorations on the base screen.
 *
 * **These are not collected.** The ladder above is a reward system: reaching a
 * goal unlocks a button, and pressing it pays out. A capstone here is a
 * decoration — it lights up the moment the empire meets the condition, with
 * nothing to press and nothing to pay. `AchievementView.unlocked` is already
 * the derived condition (`claimed || raw >= goal`), which is why the board can
 * borrow this catalog for its *conditions* while `EmpireGloryAward` — not the
 * claim receipt — records when each empire arrived. See src/server/gloryBoard.ts.
 *
 * The conditions are picked out by key rather than re-declared so they cannot
 * drift from the ones the game already evaluates, and so no new stat has to be
 * gathered. The strip this replaced was gated on `empire.level` — a column
 * gameplay never writes — so all five of its milestones were locked forever.
 *
 * Order is the arc of a run: your first empire-wide ceiling, then the grinds,
 * then the two that require beating other people.
 */
export const GLORY_KEYS: readonly string[] = [
  "cities_10",
  `citizenup_${CITIZEN_GROWTH_500}`,
  "herolvl_100",
  "minelvl_250",
  "arsenal_90",
];

/**
 * Three capstones were deliberately left off this board.
 *
 * `rank_one` is the important one: rank 1 of a city bucket is occupied from the
 * moment the second player registers, so a "world record" for it would be set
 * on day one by whoever happened to be ahead and would say nothing about
 * reaching the end of anything. It is a *standing*, not a ceiling — the
 * rankings page is where it belongs.
 *
 * `heroreset_1` and `all_bosses` are real ceilings but repeatable ones, and the
 * board reads best at five. All three remain in the reward ladder above; only
 * the decoration board is opinionated about them.
 */

/**
 * What each capstone is *called on the board*, overriding the catalog name.
 *
 * The board names a goal to reach ("להגיע לעיר 10"); the reward ladder names an
 * accolade earned ("קיסרות"). Both readings are right for their own screen, and
 * one map keeps the two from having to agree.
 */
export const GLORY_NAME: Record<string, string> = {
  cities_10: "להגיע לעיר 10",
  [`citizenup_${CITIZEN_GROWTH_500}`]: "להגיע לשדרוג של 500 אזרחים בעדכון יומי",
  herolvl_100: "גיבור הגיע לרמה 100",
  minelvl_250: "להגיע למקסימום מכרות",
  arsenal_90: "להגיע לכל דגמי הנשק",
};

/** The line under each name — the concrete mechanic, never a repeat of it. */
export const GLORY_TAGLINE: Record<string, string> = {
  cities_10: "האימפריה המלאה, כל עשר הערים",
  [`citizenup_${CITIZEN_GROWTH_500}`]: `שדרוג "קבלת אזרחים" ברמה ${CITIZEN_GROWTH_500}`,
  herolvl_100: "הרמה האחרונה של הגיבור",
  minelvl_250: `ארבעת המכרות ברמה ${MINE_MAX_LEVEL}`,
  arsenal_90: `כל ${WEAPON_TOTAL} הדגמים במחסן`,
};

/** Who holds a capstone's world record, as the board renders it. */
export interface GloryRecord {
  empireId: string;
  empireName: string;
  /**
   * "12.07.26", formatted here rather than in the board.
   *
   * The board is a client component, and a date formatted on both sides of
   * hydration is formatted in two different time zones — the server's and the
   * reader's. Doing it once, on the server, makes the string authoritative.
   */
  awardedLabel: string;
  /** True when the record holder is the empire currently looking at the board. */
  isMe: boolean;
}

const gloryDate = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

/** One capstone as the showcase renders it. */
export interface GloryView extends AchievementView {
  /** The short epithet from GLORY_TAGLINE, falling back to the full hint. */
  tagline: string;
  /** First empire in the game to reach it; null while the record is open. */
  record: GloryRecord | null;
}

/**
 * Pull the capstones out of a built ladder, in GLORY_KEYS order, and attach the
 * world record for each.
 *
 * Silently skips a key with no catalog entry, so retuning a condition (which
 * mints a new key — see `chain`) degrades to a shorter board instead of
 * throwing on the base screen, which every player loads.
 */
export function selectGlory(
  state: AchievementsState,
  records: ReadonlyMap<
    string,
    { empireId: string; empireName: string; awardedAt: Date }
  >,
  viewerEmpireId: string
): GloryView[] {
  const byKey = new Map(state.items.map((i) => [i.key, i]));
  return GLORY_KEYS.flatMap((key) => {
    const item = byKey.get(key);
    if (!item) return [];
    const held = records.get(key);
    return [
      {
        ...item,
        name: GLORY_NAME[key] ?? item.name,
        tagline: GLORY_TAGLINE[key] ?? item.hint,
        record: held
          ? {
              empireId: held.empireId,
              empireName: held.empireName,
              awardedLabel: gloryDate.format(held.awardedAt),
              isMe: held.empireId === viewerEmpireId,
            }
          : null,
      },
    ];
  });
}

/**
 * Read one achievement's progress, failing closed.
 *
 * The clamp to a finite number is load-bearing, not defensive dressing. The
 * natural way to write the claim guard is `if (progress < goal) continue`, and
 * if `progress` is `undefined` or `NaN` — a stat the snapshot did not
 * populate — that comparison is `false`, so the guard does NOT skip and the
 * reward is paid for a milestone nobody reached. Every read goes through here
 * so an absent stat reads as zero progress in both the UI and the payout.
 */
export function achievementProgress(
  a: AchievementDefinition,
  stats: AchievementStats
): number {
  const raw = a.progress(stats);
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

/** Whether this achievement's condition is currently satisfied. */
export function isAchievementReached(
  a: AchievementDefinition,
  stats: AchievementStats
): boolean {
  return achievementProgress(a, stats) >= a.goal;
}

/**
 * Project a stats snapshot + the set of collected keys into the view model.
 * Pure, so the server action and the page share one definition of "unlocked".
 */
export function buildAchievementsState(
  stats: AchievementStats,
  claimedKeys: ReadonlySet<string>
): AchievementsState {
  const items = ACHIEVEMENTS.map((a) => {
    const claimed = claimedKeys.has(a.key);
    const raw = achievementProgress(a, stats);
    // A collected achievement always shows full: its condition may since have
    // lapsed (gold spent, soldiers lost, rank taken) but the reward is banked,
    // and watching it slide back to 3/10 would read as a bug.
    const progress = claimed ? a.goal : Math.max(0, Math.min(a.goal, raw));
    return {
      key: a.key,
      category: a.category,
      name: a.name,
      hint: a.hint,
      icon: a.icon,
      rewardLabel: achievementRewardLabel(a),
      rewardKind: a.reward.kind,
      rewardAmount: a.reward.amount,
      goal: a.goal,
      progress,
      unlocked: claimed || raw >= a.goal,
      claimed,
    };
  });

  return {
    items,
    collectable: items.filter((i) => i.unlocked && !i.claimed).length,
    claimed: items.filter((i) => i.claimed).length,
    total: items.length,
  };
}
