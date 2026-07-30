import type { GameSeason } from "@prisma/client";
import type { IconName } from "@/components/ui/Icon";
import { dailyUpdatesBetween } from "./time";
import { secureRandom } from "./random";

/**
 * Wheel-of-fortune prize table. Two growth ladders, both clocked off the
 * daily-update cycle (see `seasonCycle`), because the two prize families are
 * worth wildly different things:
 *
 * - `"double"` — the four resources. They open at a genuinely useful
 *   WHEEL_RESOURCE_BASE and then **double once a day**, so the wheel keeps pace
 *   with an economy that is itself exponential (mines, cities, interest). A
 *   fixed or linear payout stops mattering by week two.
 * - `"step"` — diamonds and citizens, deliberately on one shared ladder so the
 *   two wedges always pay the identical number (9/9, then 11/11, 13/13 …).
 *   These are the scarce currencies: diamonds price the real-money store,
 *   citizens are capped by city count, and neither survives doubling.
 *
 * The one unit prize (a hero item) is always a single rolled grant.
 */

/** Day-1 payout of every resource wedge — gold, iron, stone and wood alike. */
export const WHEEL_RESOURCE_BASE = 5000;

/**
 * Daily-update cycles per doubling of a `"double"` prize. DAILY_UPDATE_TIMES
 * fires twice a day, so 2 cycles = one doubling a day.
 */
export const WHEEL_DOUBLE_EVERY_CYCLES = 2;

/**
 * Ceiling on how many times a `"double"` prize may double. Season length is
 * admin-set and unbounded (see the season form in admin), so uncapped daily
 * doubling would pay 5,000 × 2^89 on a 90-day season — a number no resource
 * bar, formatter or balance pass survives. At 20 the resource wedges plateau
 * at ~5.24B a spin from day 21 on, which is still the largest single payout
 * in the game.
 */
export const WHEEL_MAX_DOUBLINGS = 20;

/** Day-1 payout of the diamond and citizen wedges — always equal to each other. */
export const WHEEL_PREMIUM_BASE = 9;

/** How much the shared diamond/citizen ladder gains on every daily update. */
export const WHEEL_PREMIUM_STEP = 2;

/**
 * Spins granted on each daily update. Spins bank without limit — there is
 * deliberately no cap, so time away is never wasted. The live value is the
 * admin tunable `daily.wheelSpins` (see lib/game/config.ts); this is the
 * reference default.
 */
export const WHEEL_DAILY_SPINS = 3;

export type WheelPrizeKind = "amount" | "unit";

/** Which growth ladder an `amount` prize rides — see the file header. */
export type WheelGrowth = "double" | "step";

export interface WheelPrizeDef {
  key: string;
  label: string;
  /** Shared icon-set name — resource wedges resolve through `RESOURCE_ICON`. */
  icon: IconName;
  color: string;
  kind: WheelPrizeKind;
  /** Day-1 amount for `kind: "amount"` prizes; ignored for unit prizes. */
  base: number;
  /** Growth ladder for `kind: "amount"` prizes; ignored for unit prizes. */
  growth?: WheelGrowth;
  /** Round the grown amount to a clean, readable step. */
  step: number;
  /** Extra requirement text shown in the wheel modal, if any. */
  note?: string;
}

/**
 * 7 wedges (360/7° each), going clockwise from the top pointer.
 *
 * Deliberately only resources, diamonds, citizens and a hero item: army
 * weapons are earned in the factory, never handed out here, and there is no
 * mixed "loot" pack — it paid the same four resources the plain wedges do, so
 * it only added a wedge the player had to decode. Colors alternate red/black
 * with citizens (orange) and the item (purple) reading as the standouts.
 */
export const WHEEL_PRIZES: WheelPrizeDef[] = [
  { key: "diamonds", label: "יהלומים", icon: "diamond", color: "#6d1f1f", kind: "amount", base: WHEEL_PREMIUM_BASE, growth: "step", step: 1 },
  { key: "gold", label: "זהב", icon: "gold", color: "#141414", kind: "amount", base: WHEEL_RESOURCE_BASE, growth: "double", step: 50 },
  { key: "iron", label: "ברזל", icon: "iron", color: "#6d1f1f", kind: "amount", base: WHEEL_RESOURCE_BASE, growth: "double", step: 50 },
  { key: "stone", label: "אבן", icon: "stone", color: "#141414", kind: "amount", base: WHEEL_RESOURCE_BASE, growth: "double", step: 50 },
  { key: "wood", label: "עץ", icon: "wood", color: "#6d1f1f", kind: "amount", base: WHEEL_RESOURCE_BASE, growth: "double", step: 50 },
  { key: "citizens", label: "אזרחים", icon: "citizens", color: "#c9761b", kind: "amount", base: WHEEL_PREMIUM_BASE, growth: "step", step: 1 },
  { key: "item", label: "חפץ לגיבור", icon: "spark", color: "#6d28d9", kind: "unit", base: 1, step: 1, note: "דורש מקום פנוי בתיק הגיבור" },
];

/** A concrete quantity actually granted by a spin, in the prize's own unit. */
export interface WheelGrant {
  /** A `WHEEL_PRIZES` key — the display icon/label is resolved from that def. */
  key: string;
  amount: number;
}

const PRIZE_BY_KEY: Record<string, WheelPrizeDef> = Object.fromEntries(
  WHEEL_PRIZES.map((p) => [p.key, p])
);

/** Resolve the prize definition (icon/label/kind) behind a grant's key. */
export function wheelPrizeByKey(key: string): WheelPrizeDef | undefined {
  return PRIZE_BY_KEY[key];
}

/**
 * How many daily-update cycles the season has run through, 1-based.
 *
 * This is the growth clock for the wheel: DAILY_UPDATE_TIMES fires twice a day,
 * so cycle 1 is the season's opening, cycle 2 starts at the next daily update
 * that evening, and so on. Clamped to the season's own length so an expired
 * season keeps paying its final amounts instead of growing forever, and falls
 * back to cycle 1 when no season is active.
 */
export function seasonCycle(
  season: Pick<GameSeason, "startsAt" | "endsAt"> | null | undefined,
  now: number
): number {
  if (!season) return 1;
  const elapsed = dailyUpdatesBetween(season.startsAt, new Date(now)).length + 1;
  const total =
    dailyUpdatesBetween(season.startsAt, season.endsAt).length + 1;
  return Math.min(Math.max(elapsed, 1), Math.max(total, 1));
}

/**
 * Amount a prize pays on a given daily-update cycle. Unit prizes always pay 1,
 * and cycle 1 always pays exactly the base, so day 1 is the published number.
 *
 * `"step"` prizes gain WHEEL_PREMIUM_STEP on *every* daily update (9 → 11 → 13
 * …), while `"double"` prizes double once every WHEEL_DOUBLE_EVERY_CYCLES —
 * i.e. the diamond/citizen ladder climbs twice a day and the resources double
 * once a day, both off the same cycle clock.
 */
export function wheelPrizeAmount(prize: WheelPrizeDef, cycle: number): number {
  if (prize.kind === "unit") return 1;
  const elapsed = Math.max(cycle, 1) - 1;
  if (prize.growth === "step") {
    return prize.base + WHEEL_PREMIUM_STEP * elapsed;
  }
  const doublings = Math.min(
    Math.floor(elapsed / WHEEL_DOUBLE_EVERY_CYCLES),
    WHEEL_MAX_DOUBLINGS
  );
  const grown = prize.base * 2 ** doublings;
  return Math.max(prize.step, Math.round(grown / prize.step) * prize.step);
}

/** Uniformly pick a winning wedge index. The server owns this roll. */
export function pickWheelPrizeIndex(random: () => number = secureRandom): number {
  return Math.floor(random() * WHEEL_PRIZES.length);
}
