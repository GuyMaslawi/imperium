import { describe, expect, it } from "vitest";
import {
  GUILD_WAR_MIN_GUILDS,
  GUILD_WAR_ROUNDS,
  GUILD_WAR_RUNNER_UP_MIN_GUILDS,
  GUILD_WAR_SWING,
  applySwing,
  breakthroughPoints,
  clashPoints,
  holdPoints,
  liveWarStart,
  memberForRound,
  opponentForRound,
  powerRating,
  prizeForRank,
  registrationWarStart,
  roundStartsAt,
  roundsDueBy,
  warEndsAt,
} from "@/lib/game/guildWar";

/** 2026-07-30, 19:45 Jerusalem — inside a war window. */
const DURING = new Date("2026-07-30T16:45:00.000Z");
/** 2026-07-30, 10:00 Jerusalem — before the bell. */
const BEFORE = new Date("2026-07-30T07:00:00.000Z");

describe("pairing", () => {
  it("never pairs a guild with itself, at any size or round", () => {
    for (let guilds = 2; guilds <= 12; guilds++) {
      for (let round = 0; round < GUILD_WAR_ROUNDS; round++) {
        for (let i = 0; i < guilds; i++) {
          const foe = opponentForRound(guilds, round, i);
          expect(foe).not.toBe(i);
          expect(foe).toBeGreaterThanOrEqual(0);
          expect(foe).toBeLessThan(guilds);
        }
      }
    }
  });

  it("refuses to pair a field of one", () => {
    expect(opponentForRound(1, 0, 0)).toBe(-1);
    expect(opponentForRound(0, 0, 0)).toBe(-1);
  });

  it("rotates rivals rather than fixing one for the night", () => {
    const seen = new Set<number>();
    for (let round = 0; round < GUILD_WAR_ROUNDS; round++) {
      seen.add(opponentForRound(4, round, 0));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("member rotation", () => {
  it("cycles a full roster across the campaign", () => {
    const picked = new Set<number>();
    for (let round = 0; round < GUILD_WAR_ROUNDS; round++) {
      picked.add(memberForRound(5, round));
    }
    expect([...picked].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("fields the founder every round in a guild of one", () => {
    for (let round = 0; round < GUILD_WAR_ROUNDS; round++) {
      expect(memberForRound(1, round)).toBe(0);
    }
  });

  it("is stable — the same round always picks the same member", () => {
    // This is what lets a round be materialised late and still be the same
    // fight it would have been on time.
    expect(memberForRound(7, 13)).toBe(memberForRound(7, 13));
    expect(memberForRound(7, 13, 3)).toBe(memberForRound(7, 13, 3));
  });

  it("returns -1 for an empty roster", () => {
    expect(memberForRound(0, 4)).toBe(-1);
  });
});

describe("the day's swing", () => {
  it("stays inside ±GUILD_WAR_SWING", () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
      const out = applySwing(1000, roll);
      expect(out).toBeGreaterThanOrEqual(1000 * (1 - GUILD_WAR_SWING));
      expect(out).toBeLessThanOrEqual(1000 * (1 + GUILD_WAR_SWING));
    }
  });

  it("is centred: an even roll leaves the power untouched", () => {
    expect(applySwing(1000, 0.5)).toBeCloseTo(1000, 6);
  });

  it("cannot let a 20%-weaker guild beat a stronger one on the worst roll", () => {
    // The swing is meant to steal clashes, not to invert the ladder outright.
    const strongestUnlucky = applySwing(1000, 0);
    const weakestLucky = applySwing(650, 0.999);
    expect(strongestUnlucky).toBeGreaterThan(weakestLucky);
  });
});

describe("scoring", () => {
  it("rates power on a log scale", () => {
    expect(powerRating(1_000)).toBe(75);
    expect(powerRating(1_000_000)).toBe(150);
    expect(powerRating(1_000_000_000)).toBe(225);
  });

  it("floors the rating so zero power cannot score negative", () => {
    expect(powerRating(0)).toBeGreaterThan(0);
    expect(powerRating(-5)).toBeGreaterThan(0);
  });

  it("pays a breakthrough more than a hold against the same foe", () => {
    expect(breakthroughPoints(1_000_000)).toBeGreaterThan(holdPoints(1_000_000));
  });

  it("hands the points to the attacker on a win and the defender on a hold", () => {
    const attacker = 900;
    const defender = 1_000_000;
    expect(clashPoints(true, attacker, defender)).toBe(breakthroughPoints(defender));
    expect(clashPoints(false, attacker, defender)).toBe(holdPoints(attacker));
  });
});

describe("prizes", () => {
  it("pays nobody below the minimum field", () => {
    expect(prizeForRank(1, GUILD_WAR_MIN_GUILDS - 1)).toBeNull();
  });

  it("pays the champion at the minimum field but not the runner-up", () => {
    expect(prizeForRank(1, GUILD_WAR_MIN_GUILDS)).not.toBeNull();
    expect(prizeForRank(2, GUILD_WAR_MIN_GUILDS)).toBeNull();
  });

  it("opens second place once the field is deep enough", () => {
    expect(prizeForRank(2, GUILD_WAR_RUNNER_UP_MIN_GUILDS)).not.toBeNull();
  });

  it("pays nothing off the podium", () => {
    expect(prizeForRank(3, 10)).toBeNull();
    expect(prizeForRank(99, 100)).toBeNull();
  });

  it("never pays gold or diamonds — capacity only", () => {
    // Gold is plunderable and diamonds are the paid currency; a nightly purse of
    // either would evaporate or undercut the store. See GUILD_WAR_PRIZES.
    const prize = prizeForRank(1, 5)!;
    expect(Object.keys(prize)).not.toContain("gold");
    expect(Object.keys(prize)).not.toContain("diamonds");
    expect(prize.citizens + prize.turns + prize.wheelSpins).toBeGreaterThan(0);
  });
});

describe("the window", () => {
  it("opens with a clash rather than a minute of silence", () => {
    const start = liveWarStart(DURING)!;
    expect(roundsDueBy(start, start)).toBe(1);
  });

  it("never runs past the scheduled number of rounds", () => {
    const start = liveWarStart(DURING)!;
    const wayLater = new Date(start.getTime() + 10 * 3_600_000);
    expect(roundsDueBy(start, wayLater)).toBe(GUILD_WAR_ROUNDS);
  });

  it("owes nothing before the bell", () => {
    const start = liveWarStart(DURING)!;
    expect(roundsDueBy(start, new Date(start.getTime() - 1))).toBe(0);
  });

  it("materialises one round per minute", () => {
    const start = liveWarStart(DURING)!;
    expect(roundsDueBy(start, new Date(start.getTime() + 5 * 60_000))).toBe(6);
  });

  it("stamps each round with its own scheduled minute", () => {
    const start = liveWarStart(DURING)!;
    expect(roundStartsAt(start, 0).getTime()).toBe(start.getTime());
    expect(roundStartsAt(start, 7).getTime()).toBe(start.getTime() + 7 * 60_000);
  });

  it("reports a live window only while one is open", () => {
    expect(liveWarStart(DURING)).not.toBeNull();
    expect(liveWarStart(BEFORE)).toBeNull();
  });

  it("closes exactly at the end of the window", () => {
    const start = liveWarStart(DURING)!;
    const end = warEndsAt(start);
    expect(liveWarStart(new Date(end.getTime() - 1))).not.toBeNull();
    expect(liveWarStart(end)).toBeNull();
  });
});

describe("registration", () => {
  it("always books a bell that has not rung", () => {
    for (const now of [BEFORE, DURING, new Date("2026-07-30T23:30:00.000Z")]) {
      expect(registrationWarStart(now).getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("books tomorrow when the bell has already rung — you cannot walk into a war", () => {
    // The whole prize-sniping fix rests on this: entries are frozen at the bell.
    const live = liveWarStart(DURING)!;
    expect(registrationWarStart(DURING).getTime()).toBeGreaterThan(
      warEndsAt(live).getTime() - 1
    );
  });

  it("agrees with liveWarStart about where a bell sits", () => {
    // If these two disagreed by a millisecond, the war row would never be found
    // by `findUnique({ startsAt })` and no war would ever run.
    const booked = registrationWarStart(BEFORE);
    const live = liveWarStart(new Date(booked.getTime() + 60_000));
    expect(live?.getTime()).toBe(booked.getTime());
  });
});
