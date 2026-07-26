import type { IconName } from "@/components/ui/Icon";

/**
 * Achievements: a one-off (never resetting) reward ladder for milestones the
 * player passes exactly once per empire.
 *
 * Three rules shape the design:
 *
 * 1. **Progress is derived, never stored.** Each entry declares a `progress`
 *    function over an `AchievementStats` snapshot that
 *    `src/server/actions/achievements.ts` assembles from tables the game
 *    already writes — battle reports, spy reports, buildings, army, hero items.
 *    Nothing has to be instrumented at the call site, and a condition can be
 *    retuned here without touching the database. The only row ever written is
 *    the claim receipt (`EmpireAchievement`).
 *
 * 2. **Claiming is explicit.** Reaching the goal unlocks the reward; the player
 *    still has to collect it. That keeps the payout on a path we control
 *    (guarded insert + credit in one transaction) instead of firing from a
 *    dozen unrelated gameplay actions.
 *
 * 3. **Diamonds are rationed.** The season pass excludes diamonds outright
 *    because it repeats twice a day and would undercut the real-money store
 *    (see seasonPass.ts). Achievements fire once per empire *ever*, so a small
 *    diamond budget is affordable — but it is deliberately kept to the three
 *    entries below, totalling ACHIEVEMENT_DIAMOND_BUDGET over an account's
 *    entire lifetime, which is about one entry-tier store package.
 */

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

/**
 * Everything the catalog can test against, gathered once per page load.
 * Counters are lifetime totals for the empire unless noted.
 */
export interface AchievementStats {
  /** Attacks this empire launched, win or lose. */
  attacksLaunched: number;
  /** Attacks this empire launched and won. */
  attackWins: number;
  /** Spy missions this empire launched. */
  spyMissions: number;
  /** Hero items owned (equipped or in the bag). */
  heroItems: number;
  /** Hero items of LEGENDARY rarity. */
  legendaryItems: number;
  /** Weapon categories the empire holds at least one unit of. */
  hasAttackWeapon: boolean;
  hasDefenseWeapon: boolean;
  hasSpyWeapon: boolean;
  /** Level of the CITIZEN_GROWTH upgrade (starts at 1, so 2 = upgraded once). */
  citizenGrowthLevel: number;
  /** Production buildings raised above level 0 — mines start unbuilt. */
  minesBuilt: number;
  /** Cities held (starts at 1). */
  cities: number;
  /** Gold on hand right now — a high-water mark is not stored. */
  gold: number;
  soldiers: number;
  /** Bank DEPOSIT transactions made. */
  bankDeposits: number;
  /** City-boss runs won. */
  bossWins: number;
  /** Currently a member of a guild. */
  inGuild: boolean;
  heroLevel: number;
  /**
   * Rank 1 of the city bucket the empire competes in. Computing this needs an
   * O(bucket) power scan, so the caller only fills it in when the achievement
   * is still unclaimed — see `needsRankScan`.
   */
  isRankOne: boolean;
}

export interface AchievementDefinition {
  /** Stable id persisted in EmpireAchievement.key — never reuse or rename. */
  key: string;
  name: string;
  /** One-line hint shown under the name, telling the player how to get it. */
  hint: string;
  icon: IconName;
  reward: { kind: AchievementRewardKind; amount: number };
  /** Value of `progress` that unlocks the reward. */
  goal: number;
  /** Current standing against `goal`, clamped by the caller for display. */
  progress: (s: AchievementStats) => number;
}

/**
 * The one achievement whose condition costs a full power scan of the city
 * bucket. Callers skip that scan once it is claimed.
 */
export const RANK_ONE_KEY = "rank_one";

/** Total diamonds the whole ladder can ever pay a single empire. */
export const ACHIEVEMENT_DIAMOND_BUDGET = 500;

/**
 * Display order is progression order: the opening tutorial beats first, the
 * long grinds last.
 */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    key: "first_attack",
    name: "תקיפה ראשונה",
    hint: "תקוף אימפריה אחת מהדירוג",
    icon: "attack",
    reward: { kind: "citizens", amount: 40 },
    goal: 1,
    progress: (s) => s.attacksLaunched,
  },
  {
    key: "first_spy",
    name: "ריגול ראשון",
    hint: "שלח מרגלים לאימפריה אחת",
    icon: "spy",
    reward: { kind: "citizens", amount: 40 },
    goal: 1,
    progress: (s) => s.spyMissions,
  },
  {
    key: "first_mine",
    name: "לבנות מכרה",
    hint: "שדרג מכרה אחד מרמה 0",
    icon: "mine",
    reward: { kind: "wood", amount: 5_000 },
    goal: 1,
    progress: (s) => s.minesBuilt,
  },
  {
    key: "attack_weapon",
    name: "לקנות נשק התקפה",
    hint: "רכוש כלי נשק אחד מקטגוריית התקפה",
    icon: "attack",
    reward: { kind: "turns", amount: 25 },
    goal: 1,
    progress: (s) => (s.hasAttackWeapon ? 1 : 0),
  },
  {
    key: "defense_weapon",
    name: "לקנות נשק הגנה",
    hint: "רכוש כלי נשק אחד מקטגוריית הגנה",
    icon: "shield",
    reward: { kind: "turns", amount: 25 },
    goal: 1,
    progress: (s) => (s.hasDefenseWeapon ? 1 : 0),
  },
  {
    key: "spy_weapon",
    name: "לקנות נשק ריגול",
    hint: "רכוש כלי נשק אחד מקטגוריית ריגול",
    icon: "spy",
    reward: { kind: "turns", amount: 25 },
    goal: 1,
    progress: (s) => (s.hasSpyWeapon ? 1 : 0),
  },
  {
    key: "first_deposit",
    name: "הפקדה ראשונה בבנק",
    hint: "הפקד זהב בבנק פעם אחת",
    icon: "bank",
    reward: { kind: "gold", amount: 10_000 },
    goal: 1,
    progress: (s) => s.bankDeposits,
  },
  {
    key: "first_item",
    name: "למצוא חפץ ראשון",
    hint: "נצח בתקיפה וזכה בציוד לגיבור",
    icon: "hero",
    reward: { kind: "diamonds", amount: 50 },
    goal: 1,
    progress: (s) => s.heroItems,
  },
  {
    key: "citizen_upgrade",
    name: "לשדרג קבלת מגויסים",
    hint: "שדרג את 'קבלת מגויסים' לרמה 2",
    icon: "citizens",
    reward: { kind: "citizens", amount: 60 },
    goal: 2,
    progress: (s) => s.citizenGrowthLevel,
  },
  {
    key: "all_mines",
    name: "לבנות את כל המכרות",
    hint: "העלה את ארבעת המכרות לרמה 1 ומעלה",
    icon: "factory",
    reward: { kind: "wood", amount: 40_000 },
    goal: 4,
    progress: (s) => s.minesBuilt,
  },
  {
    key: "guild_member",
    name: "להצטרף לגילדה",
    hint: "הצטרף לגילדה קיימת או הקם אחת",
    icon: "guild",
    reward: { kind: "stone", amount: 15_000 },
    goal: 1,
    progress: (s) => (s.inGuild ? 1 : 0),
  },
  {
    key: "army_1000",
    name: "צבא של 1,000",
    hint: "אמן 1,000 חיילים",
    icon: "army",
    reward: { kind: "turns", amount: 100 },
    goal: 1_000,
    progress: (s) => s.soldiers,
  },
  {
    key: "ten_wins",
    name: "10 ניצחונות",
    hint: "נצח ב־10 תקיפות",
    icon: "rankings",
    reward: { kind: "turns", amount: 120 },
    goal: 10,
    progress: (s) => s.attackWins,
  },
  {
    key: "second_city",
    name: "לעלות עיר",
    hint: "ייסד עיר שנייה",
    icon: "base",
    reward: { kind: "gold", amount: 50_000 },
    goal: 2,
    progress: (s) => s.cities,
  },
  {
    key: "boss_slayer",
    name: "להביס את בוס העיר",
    hint: "נצח את הבוס של העיר שלך",
    icon: "crown",
    reward: { kind: "iron", amount: 30_000 },
    goal: 1,
    progress: (s) => s.bossWins,
  },
  {
    key: "hero_10",
    name: "גיבור ברמה 10",
    hint: "העלה את הגיבור שלך לרמה 10",
    icon: "hero",
    reward: { kind: "turns", amount: 150 },
    goal: 10,
    progress: (s) => s.heroLevel,
  },
  {
    key: "fifty_attacks",
    name: "50 תקיפות",
    hint: "פתח ב־50 תקיפות, בניצחון או בהפסד",
    icon: "attack",
    reward: { kind: "turns", amount: 200 },
    goal: 50,
    progress: (s) => s.attacksLaunched,
  },
  {
    key: "millionaire",
    name: "מיליונר ראשון",
    hint: "החזק 1,000,000 זהב בבת אחת",
    icon: "gold",
    reward: { kind: "turns", amount: 250 },
    goal: 1_000_000,
    progress: (s) => s.gold,
  },
  {
    key: "legendary_item",
    name: "חפץ אגדי",
    hint: "זכה בציוד בדרגת נדירות אגדי",
    icon: "spark",
    reward: { kind: "diamonds", amount: 150 },
    goal: 1,
    progress: (s) => s.legendaryItems,
  },
  {
    key: RANK_ONE_KEY,
    name: "לכבוש מקום ראשון בדירוג",
    hint: "היה מספר 1 בדירוג העיר שלך",
    icon: "crown",
    reward: { kind: "diamonds", amount: 300 },
    goal: 1,
    progress: (s) => (s.isRankOne ? 1 : 0),
  },
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
