import type { HeroRarity } from "@prisma/client";
import { MAX_CITIES, type StorableResource } from "./constants";

/**
 * City bosses — the PvE tyrant that rules every city tier.
 *
 * Each of the ten city tiers (`Empire.cities`, 1..MAX_CITIES) is held by one
 * named boss. Unlike a player target, a boss is a *fixed, public* wall: its
 * power is printed on the rankings page, so a player can see exactly what they
 * are up against before marching.
 *
 * This file holds the catalog and the three curves the encounter is built from.
 * The encounter itself — a multi-round sortie against a health pool that
 * persists across the daily cycle — lives in `bossBattle.ts`, and the resolution
 * in `server/bossSiege.ts`.
 *
 * 1. **Turn cost** — 300 turns in the first city, +200 for every city after
 *    (see `bossTurnCost`). At the base turn income (1 turn / 5 min) 300 turns is
 *    roughly one full daily-update cycle of banked turns, so a sortie is a
 *    deliberate, expensive commitment rather than something you spam. It is also
 *    now the *only* limit on how often the boss can be attacked: the loot is
 *    bounded by the cycle's pool rather than by a victory counter, so extra
 *    turns buy extra attempts, never extra payouts.
 * 2. **Power** — static per tier, growing on the same ×2.5-per-tier curve the
 *    game already uses for `cityCost`. It no longer decides the fight on its own
 *    (see `bossBattle.ts`); it sets the boss's health pool and scales the damage
 *    a round deals, so a bigger army fells the tyrant faster and bleeds less.
 * 3. **Reward** — scales with the tier *and* with the current season day, on the
 *    same daily-growth idea as the season pass (see `seasonPassRewardAmount`),
 *    so the haul is always meaningful for where the season actually is. What
 *    `bossReward` returns is the haul for a *whole cycle*, which a sortie earns
 *    a share of: pro-rata as it wears the boss down, plus the hoard on the kill
 *    (see `BOSS_CHIP_SHARE` / `BOSS_KILL_SHARE`).
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
    lore: "הקיסר האפל הראשון, שיושב על כס שבור מאז שהעולם היה צעיר. מי שמפיל אותו יורש את קראלדור כולה.",
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
 * Turns spent on one sortie at the boss of `cities`: 300 in the first city, 500
 * in the second, and so on up to 2,100 in the tenth. Paid at launch and never
 * refunded — a sortie that routs still cost the march.
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
 * The boss's reference battle power. Static by design and printed on the boss
 * banner, so a player always knows what the wall is worth.
 *
 * It is the yardstick, not the verdict: the boss's health pool is a multiple of
 * it (`bossSiegeMaxHp`) and each round's damage is a fraction of the attacker's
 * power, so an army at parity fells the tyrant in one well-played sortie, an army
 * at half parity needs two or three, and an army at triple ends it in a couple
 * of rounds. Casualties are dealt per round by the tactic matrix.
 */
export function bossPower(cities: number, powerMultiplier = 1): number {
  const tier = Math.min(MAX_CITIES, Math.max(1, Math.floor(cities)));
  return Math.round(
    BOSS_BASE_POWER * Math.pow(BOSS_POWER_TIER_MULTIPLIER, tier - 1) * powerMultiplier
  );
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

/**
 * Scale-up applied to the whole haul when the boss became a siege.
 *
 * The old payout was sized against a single click, and it showed: players read
 * the boss as not worth the wait, which it wasn't — one win per cycle for a bit
 * more than the turns would have earned as ordinary attacks. The cycle haul is
 * now ×2.5, and a sortie that also lands the kill with an S grade takes home
 * `0.55 + 0.45 × 1.5` of it — about three times what the old single victory paid.
 */
export const BOSS_REWARD_SCALE = 2.5;

/**
 * The one term the scale-up is held back on.
 *
 * Mine slaves feed uncapped production, and a slave payout compounds twice over
 * (more slaves × a higher city production multiplier) — the same reason their
 * tier curve is gentler than the resource curve. ×1.75 keeps the pens a visibly
 * bigger prize without turning one cycle's boss into a permanent economy tier.
 * If it still inflates, `boss.rewardMultiplier` is the live knob.
 */
export const BOSS_REWARD_SCALE_SLAVES = 1.75;

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
 * The haul a whole cycle of the boss of `cities` is worth on season day `day`.
 *
 * This is the *pool*, not a payout: a sortie earns `bossChipFraction` of it for
 * the damage it deals and `bossKillFraction` for the kill (see `bossBattle.ts`).
 * `multiplier` is the admin-tunable global scalar.
 */
export function bossReward(cities: number, day: number, multiplier = 1): BossReward {
  const tier = Math.min(MAX_CITIES, Math.max(1, Math.floor(cities)));
  const res = (base: number) =>
    Math.round(
      (grow(base, BOSS_REWARD_TIER_MULTIPLIER, tier, day) * BOSS_REWARD_SCALE * multiplier) / 100
    ) * 100;
  return {
    gold: res(BOSS_REWARD_BASE.gold),
    wood: res(BOSS_REWARD_BASE.wood),
    iron: res(BOSS_REWARD_BASE.iron),
    stone: res(BOSS_REWARD_BASE.stone),
    slaves: Math.max(
      1,
      Math.round(
        grow(BOSS_REWARD_BASE.slaves, BOSS_SLAVE_TIER_MULTIPLIER, tier, day) *
          BOSS_REWARD_SCALE_SLAVES *
          multiplier
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
 * How long a felled tyrant stays dead before it returns at full health.
 *
 * The clock starts **when it dies**, not on a shared schedule, and that asymmetry
 * is the whole design:
 *
 *  - A boss that is alive never resets. Its wounds persist indefinitely, so a
 *    player who cannot fell it in one assault is under no time pressure at all —
 *    they chip at it across as many assaults as they like and are paid for each.
 *  - A boss that is dead is gone for an hour, with a countdown to prove it.
 *
 * This replaced a per-daily-update reset, which had both failure modes at once:
 * it punished the weak player (progress wiped at 19:30 whether or not they were
 * done) and bored the strong one (killed it at 19:31, nothing to do for 24h).
 *
 * Nothing else caps the boss, and nothing else needs to. The turn cost is the
 * real limiter: 300 turns for the first city is roughly a full day of turn income
 * (1 turn / 5 min), so an hourly respawn does not mean hourly loot — it means a
 * player who has banked turns may spend them here instead of on attacks, which is
 * a trade rather than a windfall.
 */
export const BOSS_REVIVE_MS = 60 * 60 * 1000;

/**
 * There is no victory allowance, and the absence is deliberate.
 *
 * The old rule was one win per daily update, because turn gain is uncapped (see
 * `applyPendingUpdates`). What replaced it is an economic bound rather than a
 * counter: each boss *life* is worth one haul, chip loot is paid pro-rata against
 * that life's health pool, and the kill bonus is paid once because a life can only
 * be ended once. Extra assaults against the same life therefore buy progress, not
 * duplicate payouts. See `bossBattle.ts` (`BOSS_CHIP_SHARE`) and
 * `server/bossSiege.ts`.
 */
