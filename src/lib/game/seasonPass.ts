import type { GameSeason } from "@prisma/client";

/**
 * Season pass: a two-track (free / premium) reward ladder that refills on
 * every daily update.
 *
 * Three rules drive the whole design:
 *
 * 1. **It resets every daily update.** DAILY_UPDATE_TIMES fires twice a day
 *    (07:30 and 19:30), so a player gets two full ladders per day and is meant
 *    to be able to clear all eight tiers inside one ~12h cycle. XP and claimed
 *    tiers reset at each boundary; see `cycleStartOf`.
 * 2. **Payouts scale with the season day**, exactly like the wheel does — the
 *    ladder is worth little on day 1 and a lot on day 60, so a fresh empire is
 *    not handed a game-breaking pile on its first login.
 * 3. **Premium is bought once per season, not once per cycle.** The purchase
 *    lives on the progress row and survives every reset until the season
 *    itself changes.
 *
 * Deliberately absent: diamonds and hero gear. At two cycles a day for a whole
 * season even a 3-diamond tier would pay out hundreds of diamonds against a
 * 10-diamond pass price, undercutting the real-money store (see
 * DiamondPurchase); hero items belong to attacks and the hero shop, where
 * rarity gates how often they appear. Resources, turns and citizens carry the
 * ladder instead.
 */

/** Fraction of the base amount added for each day elapsed in the season. */
export const SEASON_PASS_DAILY_GROWTH = 0.25;

/** XP required for each successive tier — tier N unlocks at N × this. */
export const SEASON_PASS_XP_PER_TIER = 50;

export const SEASON_PASS_TIER_COUNT = 8;

/** Diamond cost of the premium track. Charged once per season. */
export const SEASON_PASS_PREMIUM_PRICE = 10;

/* ------------------------------ XP sources ------------------------------ */

/**
 * Every gameplay action worth season-pass XP. The values are tuned so a
 * moderately active player clears all eight tiers (400 XP) within one ~12h
 * cycle: a low-level empire banks ~144 turns per cycle, which is ~14 attacks.
 */
export const SEASON_PASS_XP = {
  attack: 25,
  spy: 10,
  mineUpgrade: 15,
  storageUpgrade: 15,
  empireUpgrade: 20,
  trainUnits: 10,
  buyWeapon: 10,
  bankDeposit: 10,
  wheelSpin: 5,
  miniGame: 20,
  foundCity: 40,
} as const;

export type SeasonPassAction = keyof typeof SEASON_PASS_XP;

/**
 * Spend thresholds for the actions whose cost the *caller* chooses.
 *
 * `SEASON_PASS_XP` pays per successful call, which is safe only where the call
 * itself is scarce (attacks cost turns, wheel spins are rationed, a city can be
 * founded once). For `trainUnits`, `buyWeapon` and `bankDeposit` the player
 * picks the quantity, so paying per call made the whole ladder farmable for
 * almost nothing: 40 × `buyWeapon(quantity: 1)` on the cheapest always-unlocked
 * weapon cost ~5,000 resources and cleared all eight tiers, which pay ~21,000
 * back on day 1 and 15.75× that by day 60 — twice a day, forever. The pass was
 * net-positive on its own input.
 *
 * So these actions earn XP per unit of value actually spent, floored. A
 * quantity-1 purchase falls under `per` and earns exactly nothing, which is
 * what kills the farm; `maxUnits` stops one huge transaction from clearing the
 * ladder in a single call. Tune `per` to shift how much real play the pass
 * costs — the exploit is closed by the shape, not by these particular numbers.
 */
export const SEASON_PASS_SPEND_XP = {
  /** Total gold+wood+iron+stone handed over. */
  buyWeapon: { per: 2_000, maxUnits: 3 },
  /** Citizens converted into units. */
  trainUnits: { per: 25, maxUnits: 3 },
  /** Gold moved into the bank. */
  bankDeposit: { per: 5_000, maxUnits: 3 },
} as const;

export type SeasonPassSpendAction = keyof typeof SEASON_PASS_SPEND_XP;

/**
 * How many XP units a spend-based action earned. Returns 0 — meaning no XP at
 * all — for any outlay below one threshold.
 */
export function seasonPassSpendUnits(
  action: SeasonPassSpendAction,
  spend: number
): number {
  const { per, maxUnits } = SEASON_PASS_SPEND_XP[action];
  if (!Number.isFinite(spend) || spend <= 0) return 0;
  return Math.min(maxUnits, Math.floor(spend / per));
}

/** Total XP needed to have unlocked `tier` (1-based). */
export function xpForTier(tier: number): number {
  return Math.max(1, tier) * SEASON_PASS_XP_PER_TIER;
}

/** Highest tier unlocked by `xp`, clamped to the ladder length. */
export function tierForXp(xp: number): number {
  return Math.min(
    SEASON_PASS_TIER_COUNT,
    Math.floor(Math.max(0, xp) / SEASON_PASS_XP_PER_TIER)
  );
}

/** XP that clears the whole ladder — the per-cycle goal shown in the UI. */
export const SEASON_PASS_XP_MAX = xpForTier(SEASON_PASS_TIER_COUNT);

/* ------------------------------ reward table ------------------------------ */

/** Every reward kind the ladder can pay. All of them scale with the season day. */
export type SeasonPassRewardKind =
  | "gold"
  | "wood"
  | "iron"
  | "stone"
  | "turns"
  | "citizens";

export interface SeasonPassReward {
  kind: SeasonPassRewardKind;
  icon: string;
  /** Day-1 quantity. */
  base: number;
  /** Round the grown amount to a clean, readable step. */
  step: number;
}

export interface SeasonPassTier {
  tier: number;
  free: SeasonPassReward;
  premium: SeasonPassReward;
}

/**
 * Eight tiers, premium paying 3× the free track — which is exactly what the
 * upsell in the modal promises ("פי 3 שלל").
 *
 * No hero gear here on purpose. Hero items are meant to be won by fighting (a
 * captured drop from a won attack) or bought in the hero shop; handing a
 * guaranteed one out twice a day for clearing a ladder made the rarest tier
 * routine and undercut both sources.
 */
export const SEASON_PASS_TIERS: SeasonPassTier[] = [
  {
    tier: 1,
    free: { kind: "gold", icon: "🪙", base: 4000, step: 100 },
    premium: { kind: "gold", icon: "🪙", base: 12000, step: 100 },
  },
  {
    tier: 2,
    free: { kind: "wood", icon: "🌲", base: 3000, step: 100 },
    premium: { kind: "wood", icon: "🌲", base: 9000, step: 100 },
  },
  {
    tier: 3,
    free: { kind: "iron", icon: "⚙️", base: 2500, step: 100 },
    premium: { kind: "iron", icon: "⚙️", base: 7500, step: 100 },
  },
  {
    tier: 4,
    free: { kind: "stone", icon: "🪨", base: 2500, step: 100 },
    premium: { kind: "stone", icon: "🪨", base: 7500, step: 100 },
  },
  {
    tier: 5,
    free: { kind: "turns", icon: "🔄", base: 40, step: 5 },
    premium: { kind: "turns", icon: "🔄", base: 120, step: 5 },
  },
  {
    tier: 6,
    free: { kind: "citizens", icon: "👥", base: 25, step: 5 },
    premium: { kind: "citizens", icon: "👥", base: 75, step: 5 },
  },
  {
    tier: 7,
    free: { kind: "gold", icon: "🪙", base: 5000, step: 100 },
    premium: { kind: "gold", icon: "🪙", base: 15000, step: 100 },
  },
  {
    tier: 8,
    free: { kind: "wood", icon: "🌲", base: 4000, step: 100 },
    premium: { kind: "wood", icon: "🌲", base: 12000, step: 100 },
  },
];

/** Hebrew label for a reward kind, used by both the UI and the claim toast. */
export const SEASON_PASS_REWARD_LABEL: Record<SeasonPassRewardKind, string> = {
  gold: "זהב",
  wood: "עץ",
  iron: "ברזל",
  stone: "אבן",
  turns: "תורות",
  citizens: "אזרחים",
};

/**
 * Current day of the season (1-based), clamped to the season's length so an
 * expired season keeps paying its final-day amounts rather than growing
 * forever. Without an active season everything falls back to day 1.
 *
 * Note this is a *day*, not the wheel's per-daily-update `seasonCycle`: the
 * pass refreshes twice a day but its payouts are priced once per day, so both
 * of a day's ladders are worth the same.
 */
export function seasonPassDay(
  season: Pick<GameSeason, "startsAt" | "endsAt"> | null | undefined,
  now: number
): number {
  if (!season) return 1;
  const dayMs = 86_400_000;
  const elapsed = Math.floor((now - season.startsAt.getTime()) / dayMs) + 1;
  const total = Math.max(
    1,
    Math.ceil((season.endsAt.getTime() - season.startsAt.getTime()) / dayMs)
  );
  return Math.min(Math.max(elapsed, 1), total);
}

/** Quantity a reward pays on a given season day. */
export function seasonPassRewardAmount(
  reward: SeasonPassReward,
  day: number
): number {
  const grown =
    reward.base * (1 + SEASON_PASS_DAILY_GROWTH * (Math.max(day, 1) - 1));
  return Math.max(reward.step, Math.round(grown / reward.step) * reward.step);
}
