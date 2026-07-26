import type { GameSeason } from "@prisma/client";
import { dailyUpdatesBetween } from "./time";
import { secureRandom } from "./random";

/**
 * Wheel-of-fortune prize table. Every quantity prize has a deliberately modest
 * day-1 base that grows by WHEEL_CYCLE_GROWTH of that base on **every daily
 * update** — the same cadence the season pass refreshes on, so both ladders
 * step up together twice a day rather than once. Unit prizes (item, all
 * weapons) are always a single grant, and `fixed` prizes (diamonds) never
 * grow — see the WheelPrizeDef.fixed doc for why.
 */
export const WHEEL_CYCLE_GROWTH = 0.1;

/**
 * Spins granted on each daily update. Spins bank without limit — there is
 * deliberately no cap, so time away is never wasted. The live value is the
 * admin tunable `daily.wheelSpins` (see lib/game/config.ts); this is the
 * reference default.
 */
export const WHEEL_DAILY_SPINS = 3;

export type WheelPrizeKind = "amount" | "unit";

export interface WheelPrizeDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  kind: WheelPrizeKind;
  /** Day-1 amount for `kind: "amount"` prizes; ignored for unit prizes. */
  base: number;
  /**
   * Amount prizes normally grow with the daily-update cycle; `fixed: true`
   * pins the payout to `base` for the whole season. Diamonds are fixed because
   * they price the real-money store and the premium season pass — those prices
   * don't inflate with the economy, so a growing wedge would flood the game
   * with free diamonds by mid-season. Same rule that keeps diamonds off the
   * season-pass ladder.
   */
  fixed?: boolean;
  /** Round the grown amount to a clean, readable step. */
  step: number;
  /** Extra requirement text shown in the wheel modal, if any. */
  note?: string;
}

/** 10 wedges (36° each), going clockwise from the top pointer. */
export const WHEEL_PRIZES: WheelPrizeDef[] = [
  { key: "diamonds", label: "יהלומים", icon: "💎", color: "#6d1f1f", kind: "amount", base: 3, step: 1, fixed: true },
  { key: "turns", label: "תורות", icon: "🔄", color: "#141414", kind: "amount", base: 30, step: 5 },
  { key: "gold", label: "זהב", icon: "🪙", color: "#6d1f1f", kind: "amount", base: 800, step: 50 },
  { key: "iron", label: "ברזל", icon: "⚙️", color: "#141414", kind: "amount", base: 400, step: 50 },
  { key: "stone", label: "אבן", icon: "🪨", color: "#6d1f1f", kind: "amount", base: 400, step: 50 },
  { key: "wood", label: "עץ", icon: "🪵", color: "#141414", kind: "amount", base: 500, step: 50 },
  { key: "allWeapons", label: "כל הנשק", icon: "🗡️", color: "#6d1f1f", kind: "unit", base: 1, step: 1, note: "אחד מכל סוג נשק שפתחת" },
  { key: "citizens", label: "אזרחים", icon: "👥", color: "#c9761b", kind: "amount", base: 20, step: 5 },
  { key: "item", label: "חפץ", icon: "✨", color: "#6d28d9", kind: "unit", base: 1, step: 1, note: "דורש מקום פנוי בתיק הגיבור" },
  { key: "loot", label: "שלל", icon: "🎁", color: "#141414", kind: "amount", base: 1000, step: 100, note: "חבילת משאבים מעורבת בשווי זהב" },
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
 * Amount a prize pays on a given daily-update cycle. Unit prizes always pay 1.
 * Growth is linear off the base, so cycle 1 pays exactly the modest base.
 */
export function wheelPrizeAmount(prize: WheelPrizeDef, cycle: number): number {
  if (prize.kind === "unit") return 1;
  if (prize.fixed) return prize.base;
  const grown = prize.base * (1 + WHEEL_CYCLE_GROWTH * (Math.max(cycle, 1) - 1));
  return Math.max(prize.step, Math.round(grown / prize.step) * prize.step);
}

/** Uniformly pick a winning wedge index. The server owns this roll. */
export function pickWheelPrizeIndex(random: () => number = secureRandom): number {
  return Math.floor(random() * WHEEL_PRIZES.length);
}
