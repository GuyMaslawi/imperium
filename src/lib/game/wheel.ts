import type { GameSeason } from "@prisma/client";

/**
 * Wheel-of-fortune prize table. Every quantity prize has a concrete base
 * amount that grows by WHEEL_DAILY_GROWTH of the base for each day that has
 * passed in the active season, so a spin on day 20 pays visibly more than a
 * spin on day 1. Unit prizes (item, animal…) are always a single grant.
 */
export const WHEEL_DAILY_GROWTH = 0.1;

/** Spins granted on each daily update, and the most an empire may bank. */
export const WHEEL_DAILY_SPINS = 4;
export const WHEEL_SPINS_CAP = 20;

export type WheelPrizeKind = "amount" | "unit";

export interface WheelPrizeDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  kind: WheelPrizeKind;
  /** Day-1 amount for `kind: "amount"` prizes; ignored for unit prizes. */
  base: number;
  /** Round the grown amount to a clean, readable step. */
  step: number;
  /** Extra requirement text shown in the wheel modal, if any. */
  note?: string;
}

/** 10 wedges (36° each), going clockwise from the top pointer. */
export const WHEEL_PRIZES: WheelPrizeDef[] = [
  { key: "diamonds", label: "יהלומים", icon: "💎", color: "#6d1f1f", kind: "amount", base: 10, step: 1 },
  { key: "turns", label: "תורות", icon: "🔄", color: "#141414", kind: "amount", base: 60, step: 5 },
  { key: "gold", label: "זהב", icon: "🪙", color: "#6d1f1f", kind: "amount", base: 1500, step: 50 },
  { key: "iron", label: "ברזל", icon: "⚙️", color: "#141414", kind: "amount", base: 750, step: 50 },
  { key: "stone", label: "אבן", icon: "🪨", color: "#6d1f1f", kind: "amount", base: 750, step: 50 },
  { key: "wood", label: "עץ", icon: "🪵", color: "#141414", kind: "amount", base: 1000, step: 50 },
  { key: "allWeapons", label: "כל הנשק", icon: "🗡️", color: "#6d1f1f", kind: "unit", base: 1, step: 1, note: "אחד מכל סוג נשק שפתחת" },
  { key: "citizens", label: "אזרחים", icon: "👥", color: "#c9761b", kind: "amount", base: 40, step: 5 },
  { key: "item", label: "חפץ", icon: "✨", color: "#6d28d9", kind: "unit", base: 1, step: 1, note: "דורש מקום פנוי בתיק הגיבור" },
  { key: "loot", label: "שלל", icon: "🎁", color: "#141414", kind: "amount", base: 2000, step: 100, note: "חבילת משאבים מעורבת בשווי זהב" },
];

/**
 * Current day of the season (1-based), clamped to the season's length so an
 * expired season keeps paying its final-day amounts rather than growing
 * forever. Without an active season everything falls back to day 1.
 */
export function seasonDay(
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

/** Amount a prize pays on a given season day. Unit prizes always pay 1. */
export function wheelPrizeAmount(prize: WheelPrizeDef, day: number): number {
  if (prize.kind === "unit") return 1;
  const grown = prize.base * (1 + WHEEL_DAILY_GROWTH * (Math.max(day, 1) - 1));
  return Math.max(prize.step, Math.round(grown / prize.step) * prize.step);
}

/** Uniformly pick a winning wedge index. The server owns this roll. */
export function pickWheelPrizeIndex(random: () => number = Math.random): number {
  return Math.floor(random() * WHEEL_PRIZES.length);
}
