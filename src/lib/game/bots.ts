import { MAX_CITIES, SOLDIER_POWER, SPY_POWER, cityHeroLevelRequired } from "./constants";
import { bossPower } from "./bosses";
import { HERO_MAX_LEVEL } from "./hero";
import {
  MAX_WEAPON_TIER,
  weaponByKey,
  weaponGateStatus,
  weaponsOfCategory,
} from "./weapons";

/**
 * Bot empires — the garrisons an admin plants in a city tier.
 *
 * This module is the *arithmetic* of a bot: what it is called, how strong it is
 * by default, and how a power figure is spent on soldiers, spies and weapons.
 * Nothing here touches the database — src/server/bots.ts does the planting and
 * the refilling, and the admin page reads these same functions to preview what
 * it is about to create.
 *
 * The problem a bot solves is a city with one player in it. Combat is confined
 * to your own city tier (see attackEmpire / spyOnEmpire), so the first player to
 * climb into תדמור finds a ladder with exactly one row on it — their own — and
 * every offensive action in the game becomes unavailable to them until someone
 * else arrives. A bot is a resident of that tier: raidable, spyable, worth loot,
 * and rebuilt after it is farmed.
 */

/* ------------------------------ how strong ------------------------------ */

/**
 * A bot's default power, as a fraction of the city boss's.
 *
 * `bossPower` is the game's own answer to "what does an empire of this tier
 * hold" — its doc says an army at parity with it fells the tyrant in one good
 * sortie. A target should be softer than that: a bot is what a player raids on
 * the way to the boss, not a second boss. At 60% a tier-appropriate player wins
 * comfortably, an under-levelled one still loses.
 */
export const BOT_POWER_OF_BOSS = 0.6;

/** The default military power for a bot planted in `cities`, before any spread. */
export function botDefaultPower(cities: number): number {
  return Math.round(bossPower(cities) * BOT_POWER_OF_BOSS);
}

/**
 * Floor for any bot's power. A city whose only resident is a fresh arrival
 * averages almost nothing, and a bot mirroring that average would be a target
 * worth zero turns — it dies to a single soldier and drops a purse of nothing.
 */
export const BOT_MIN_POWER = 1_000;

/** Widest random spread (±%) around the requested power the admin may ask for. */
export const BOT_SPREAD_MAX_PCT = 90;

/** Bots an admin may create in one submit, across all selected cities. */
export const BOT_BATCH_MAX = 50;

/** How long a plundered bot takes to rebuild its garrison. */
export const BOT_RESTORE_MS = 60 * 60 * 1000; // 1 hour

/**
 * The hero level a bot of this tier carries.
 *
 * `cityHeroLevelRequired` is what a *player* must reach to found the city one
 * tier below, so it is the honest reading of "the level of someone who lives
 * here". It matters for more than flavour: the ladder breaks power ties on hero
 * level, and it decides which weapon tier the garrison below may legitimately
 * carry.
 *
 * The bot's points are deliberately left unspent (see src/server/bots.ts): an
 * allocated point is +1% attack or defence, which would make the bot fight
 * harder than the power figure printed beside it on the ladder.
 */
export function botHeroLevel(cities: number): number {
  const tier = Math.min(MAX_CITIES, Math.max(1, Math.floor(cities)));
  return Math.min(HERO_MAX_LEVEL, Math.max(1, cityHeroLevelRequired(tier - 1) || 1));
}

/** Power of one weapon at `tier` in a category, or 0 if the tier does not exist. */
function weaponPowerAt(category: "ATTACK" | "DEFENSE" | "SPY", tier: number): number {
  const weapon = weaponsOfCategory(category).find((w) => w.tier === tier);
  return weapon?.power ?? 0;
}

/**
 * Smallest stack a bot's arsenal is allowed to consist of.
 *
 * Weapon power grows ×2.5 a tier while the gate that unlocks it grows with the
 * city, so the two are not on the same curve at all: a tier-10 city unlocks tier
 * 30, where one weapon is worth ~2.4 trillion power — five orders of magnitude
 * past the whole bot. Buying at the highest *unlocked* tier would round the
 * entire arsenal to zero and leave a bot made of soldiers alone.
 *
 * So the tier is chosen by what the budget can actually field. Ten is the point
 * where rounding stops mattering: a stack that size lands within a few percent
 * of its share, and the arsenal still reads as a serious one rather than as a
 * museum piece bought to be counted.
 */
const MIN_WEAPON_STACK = 10;

/**
 * The weapon tier a bot arms itself at: the best tier its city and hero level
 * could legitimately have unlocked, stepped down until the budget can field a
 * real stack of it.
 *
 * Bots buy real weapons from the real table, gated by the real gate — a spy who
 * gets into one reads an arsenal that could belong to a neighbour.
 */
export function botWeaponTier(cities: number, heroLevel: number, stackBudget = 0): number {
  let unlocked = 1;
  for (let tier = 1; tier <= MAX_WEAPON_TIER; tier++) {
    if (weaponGateStatus(tier, cities, heroLevel).met) unlocked = tier;
  }
  if (stackBudget <= 0) return unlocked;

  for (let tier = unlocked; tier > 1; tier--) {
    // The dearest of the three categories decides: they are bought at one tier,
    // so the tier has to be one all three stacks survive.
    const dearest = Math.max(
      weaponPowerAt("ATTACK", tier),
      weaponPowerAt("DEFENSE", tier),
      weaponPowerAt("SPY", tier)
    );
    if (dearest > 0 && stackBudget / dearest >= MIN_WEAPON_STACK) return tier;
  }
  return 1;
}

/* ------------------------------ the garrison ------------------------------ */

/**
 * How a bot's power is split. Military power counts soldiers once plus attack
 * and defence weapons (see getEmpireMilitaryPower), so these three sum to 1 and
 * the realised figure lands on the requested one.
 *
 * Weighted towards defence because of what a bot is for: it is attacked far more
 * often than the ladder position suggests, and the defender's own +20% already
 * rides on the defence half. An even split made bots that lost every fight to
 * anyone who could see them.
 */
const POWER_SPLIT = { soldiers: 0.34, attack: 0.28, defense: 0.38 } as const;

/**
 * Intelligence, as a fraction of military power. Spy power is a separate figure
 * that never enters the ladder, so this is additive rather than a share — it
 * buys the bot enough of a counter-intelligence rating that scouting it is a
 * real check against the spy's own, not a formality.
 */
const SPY_SHARE = 0.35;
/** Of that intelligence, how much comes from spies rather than spy weapons. */
const SPY_FROM_BODIES = 0.6;

export interface BotGarrison {
  soldiers: number;
  spies: number;
  weaponTier: number;
  attackWeapons: number;
  defenseWeapons: number;
  spyWeapons: number;
}

/** Whole units, never negative — a stack of 0.4 catapults is a stack of none. */
function units(power: number, each: number): number {
  if (each <= 0) return 0;
  return Math.max(0, Math.round(power / each));
}

/**
 * Spend a power budget on an army and an arsenal.
 *
 * The realised military power is close to `power` but not equal to it: every
 * stack rounds to whole units. `botRealisedPower` reports what was actually
 * bought, and the caller stores that — never the request — as the bot's power.
 */
export function botGarrison(power: number, cities: number, heroLevel: number): BotGarrison {
  const budget = Math.max(0, power);
  // Sized off the smallest of the three shares, so no stack is the one that
  // rounds away at the tier the other two can afford.
  const weaponTier = botWeaponTier(
    cities,
    heroLevel,
    budget * Math.min(POWER_SPLIT.attack, POWER_SPLIT.defense, SPY_SHARE * (1 - SPY_FROM_BODIES))
  );

  return {
    soldiers: units(budget * POWER_SPLIT.soldiers, SOLDIER_POWER),
    spies: units(budget * SPY_SHARE * SPY_FROM_BODIES, SPY_POWER),
    weaponTier,
    attackWeapons: units(budget * POWER_SPLIT.attack, weaponPowerAt("ATTACK", weaponTier)),
    defenseWeapons: units(budget * POWER_SPLIT.defense, weaponPowerAt("DEFENSE", weaponTier)),
    spyWeapons: units(
      budget * SPY_SHARE * (1 - SPY_FROM_BODIES),
      weaponPowerAt("SPY", weaponTier)
    ),
  };
}

/** The weapon keys a garrison's three stacks are bought as. */
export function botWeaponKeys(weaponTier: number): {
  attack: string;
  defense: string;
  spy: string;
} {
  const keyOf = (category: "ATTACK" | "DEFENSE" | "SPY") =>
    weaponsOfCategory(category).find((w) => w.tier === weaponTier)?.key ?? "";
  return { attack: keyOf("ATTACK"), defense: keyOf("DEFENSE"), spy: keyOf("SPY") };
}

/** Military power a garrison actually fields — soldiers + attack + defence weapons. */
export function botRealisedPower(garrison: BotGarrison): number {
  const keys = botWeaponKeys(garrison.weaponTier);
  return (
    garrison.soldiers * SOLDIER_POWER +
    garrison.attackWeapons * (weaponByKey(keys.attack)?.power ?? 0) +
    garrison.defenseWeapons * (weaponByKey(keys.defense)?.power ?? 0)
  );
}

/* ------------------------------ the economy ------------------------------ */

/**
 * A bot's mine level and slave count, derived from its garrison.
 *
 * Bots hold no stored (warehoused) resources on purpose — plunder only reaches
 * the *available* balance, and a bot whose purse is locked away is a bot worth
 * raiding once. Everything it owns is out in the open, and everything it owns
 * came out of its own mines on the ordinary clock: `applyPendingUpdates` settles
 * a bot's backlog the moment a raider loads it as a target, so the haul is
 * whatever it has genuinely produced since it was last robbed.
 *
 * The level tracks the tier and the slaves track the army, which keeps a bot's
 * income in the same neighbourhood as a real resident of its city rather than
 * on a curve of its own.
 */
export function botMineSetup(
  cities: number,
  soldiers: number
): { level: number; slavesPerMine: number } {
  const tier = Math.min(MAX_CITIES, Math.max(1, Math.floor(cities)));
  return {
    level: Math.max(1, tier * 4),
    slavesPerMine: Math.max(5, Math.round(soldiers / 10)),
  };
}

/* ------------------------------ the names ------------------------------ */

/**
 * Bot names are built, not drawn from a list, so a hundred of them never repeat
 * and none of them reads like a slot in a table. Two halves, both in the game's
 * register — a body of men and the thing they are named for.
 *
 * Deliberately indistinguishable from a player's empire name. A bot the ladder
 * marks as a bot is a target nobody bothers to raid, and the point of planting
 * one is that the lone resident of תדמור has someone to fight.
 */
const BOT_NAME_HEADS = [
  "בני",
  "שבט",
  "גדוד",
  "לגיון",
  "מסדר",
  "בית",
  "נסיכות",
  "ממלכת",
  "חיל",
  "משמר",
  "אנשי",
  "יורשי",
  "צאצאי",
  "נאמני",
  "שומרי",
] as const;

const BOT_NAME_TAILS = [
  "הנחושת",
  "העורב",
  "הזאב",
  "האפר",
  "הברזל",
  "הסהר",
  "המלח",
  "הבזלת",
  "הרעם",
  "הכפור",
  "החולות",
  "הלהבה",
  "הצללים",
  "השחר",
  "הנשר",
  "העקרב",
  "הגחלת",
  "החומה",
  "הנהר",
  "הכתר",
  "האורן",
  "הברקת",
  "הפלדה",
  "הדרקון",
  "הקרח",
] as const;

/** Every name this generator can produce, for the collision math. */
export const BOT_NAME_SPACE = BOT_NAME_HEADS.length * BOT_NAME_TAILS.length;

/**
 * One name from the space above. `pick` returns an integer in `[0, n)` — the
 * caller passes a real random source (crypto.randomInt on the server), which is
 * what keeps this file pure and testable.
 *
 * Empire names are unique, so the caller must be ready for a collision. With a
 * few hundred names available and bots created in tens, retrying is cheaper than
 * tracking what has been used; `botFallbackName` is the escape hatch when even
 * that runs out.
 */
export function botName(pick: (n: number) => number): string {
  const head = BOT_NAME_HEADS[pick(BOT_NAME_HEADS.length)];
  const tail = BOT_NAME_TAILS[pick(BOT_NAME_TAILS.length)];
  return `${head} ${tail}`;
}

/**
 * A name that cannot collide, for when the generated ones keep landing on names
 * already taken. Still reads as an empire — the number passes for a dynastic
 * ordinal rather than a database counter.
 */
export function botFallbackName(base: string, ordinal: number): string {
  return `${base} ${ordinal}`;
}
