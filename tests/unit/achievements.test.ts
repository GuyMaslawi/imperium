import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  GLORY_KEYS,
  type AchievementStats,
  buildAchievementsState,
  isAchievementReached,
} from "@/lib/game/achievements";
import { HERO_MAX_LEVEL } from "@/lib/game/hero";

/**
 * Only the fields a case cares about. Everything else reads as zero through
 * `achievementProgress`, which fails closed on an absent stat.
 */
const stats = (over: Partial<AchievementStats>) => over as AchievementStats;

const byKey = (key: string) => {
  const a = ACHIEVEMENTS.find((x) => x.key === key);
  if (!a) throw new Error(`no achievement ${key}`);
  return a;
};

describe("hero level ladder", () => {
  const hero100 = byKey(`herolvl_${HERO_MAX_LEVEL}`);

  it("unlocks at the cap", () => {
    expect(isAchievementReached(hero100, stats({ heroLevel: HERO_MAX_LEVEL, heroResets: 0 }))).toBe(true);
    expect(isAchievementReached(hero100, stats({ heroLevel: HERO_MAX_LEVEL - 1, heroResets: 0 }))).toBe(false);
  });

  it("survives a prestige — the reset must not un-reach what was reached", () => {
    // The reported bug: a player climbed to 100, reset (which writes level back
    // to 1), and both the reward and the world record vanished — the condition
    // read the raw column, so it was no longer true and could never be made
    // true again short of a second full climb.
    const afterReset = stats({ heroLevel: 1, heroResets: 1 });
    expect(isAchievementReached(hero100, afterReset)).toBe(true);
    for (const goal of [5, 10, 25, 50, 75]) {
      expect(isAchievementReached(byKey(`herolvl_${goal}`), afterReset)).toBe(true);
    }
  });

  it("shows the ladder as complete after a reset instead of back at 1/100", () => {
    const state = buildAchievementsState(
      stats({ heroLevel: 1, heroResets: 2 }),
      new Set<string>()
    );
    const item = state.items.find((i) => i.key === hero100.key)!;
    expect(item.unlocked).toBe(true);
    expect(item.progress).toBe(item.goal);
  });
});

describe("world-record capstones", () => {
  it("names only conditions that exist in the ladder", () => {
    for (const key of GLORY_KEYS) expect(() => byKey(key)).not.toThrow();
  });

  it("is built on conditions that can never be lost once met", () => {
    // A capstone that stops being true is a world record that disappears from
    // the board (see src/server/gloryBoard.ts — the stamp is only written when
    // the condition holds at page load). Every key here must therefore rest on
    // a stat that only ever rises. The hero one is the trap: `heroLevel` drops
    // on prestige, so it has to read the effective level.
    const peak = stats({
      cities: 10,
      citizenGrowthLevel: 100,
      heroLevel: HERO_MAX_LEVEL,
      heroResets: 0,
      maxMineLevel: 250,
      minMineLevel: 250,
      distinctWeapons: 90,
      totalWeapons: 90,
    });
    const afterPrestige = { ...peak, heroLevel: 1, heroResets: 1 };
    for (const key of GLORY_KEYS) {
      expect(isAchievementReached(byKey(key), peak), key).toBe(true);
      expect(isAchievementReached(byKey(key), afterPrestige), key).toBe(true);
    }
  });
});
