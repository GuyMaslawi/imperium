import { describe, it, expect } from "vitest";
import {
  scoreCode,
  parseHistory,
  attemptsRange,
  clampAttempts,
  HISTORY_LIMIT,
  CUPS_MIN,
  CUPS_MAX,
  SAFE_DIGITS_MAX,
  ATTEMPTS_CEILING,
} from "@/lib/game/minigame";

describe("scoreCode", () => {
  it("marks an exact code all hits", () => {
    expect(scoreCode("471", "471")).toEqual(["hit", "hit", "hit"]);
  });

  it("marks a digit that is in the code but in the wrong slot", () => {
    expect(scoreCode("714", "471")).toEqual(["near", "near", "near"]);
  });

  it("marks digits absent from the code as misses", () => {
    expect(scoreCode("235", "471")).toEqual(["miss", "miss", "miss"]);
  });

  it("mixes the three marks", () => {
    //   guess 4 1 9 vs code 4 7 1 → 4 exact, 1 present elsewhere, 9 absent.
    expect(scoreCode("419", "471")).toEqual(["hit", "near", "miss"]);
  });

  // The duplicate rule is the whole reason scoring is two passes: a digit of the
  // code may be claimed by exactly one mark. Get this wrong and the log tells the
  // player there are more of a digit than the code holds, which makes the game
  // unsolvable by reasoning.
  it("does not let two typed copies both claim one code digit", () => {
    expect(scoreCode("110", "105")).toEqual(["hit", "miss", "near"]);
  });

  it("gives exact matches priority over earlier near matches", () => {
    //   Both typed 1s could pair with the code's single 1; the exact one wins.
    expect(scoreCode("171", "571")).toEqual(["miss", "hit", "hit"]);
  });

  it("counts a repeated digit once per copy in the code", () => {
    expect(scoreCode("171", "115")).toEqual(["hit", "miss", "near"]);
    expect(scoreCode("111", "115")).toEqual(["hit", "hit", "miss"]);
  });

  // Codes are carried as strings precisely so "047" stays three digits; a
  // leading zero has to score like any other digit rather than vanish.
  it("handles a leading zero as an ordinary digit", () => {
    expect(scoreCode("047", "704")).toEqual(["near", "near", "near"]);
    expect(scoreCode("007", "070")).toEqual(["hit", "near", "near"]);
  });

  it("scores codes of any length", () => {
    expect(scoreCode("12345", "54321")).toEqual(["near", "near", "hit", "near", "near"]);
  });
});

describe("parseHistory", () => {
  it("reads back both row kinds", () => {
    const rows = parseHistory([
      { kind: "cup", pick: 2, hit: false },
      { kind: "code", code: "471", marks: ["hit", "near", "miss"] },
    ]);
    expect(rows).toEqual([
      { kind: "cup", pick: 2, hit: false },
      { kind: "code", code: "471", marks: ["hit", "near", "miss"] },
    ]);
  });

  it("drops malformed rows instead of throwing", () => {
    // A JSON column is not a schema, so anything can be in there — an older
    // shape, a hand-edited row, null.
    expect(
      parseHistory([
        null,
        "nope",
        { kind: "cup" },
        { kind: "cup", pick: 1.5, hit: true },
        { kind: "code", code: "12", marks: ["hit", "wat"] },
        { kind: "code", code: 12, marks: [] },
        { kind: "cup", pick: 0, hit: true },
      ])
    ).toEqual([{ kind: "cup", pick: 0, hit: true }]);
  });

  it("returns nothing for a non-array", () => {
    expect(parseHistory(undefined)).toEqual([]);
    expect(parseHistory({ kind: "cup", pick: 0, hit: true })).toEqual([]);
  });

  it("keeps only the most recent rows", () => {
    const many = Array.from({ length: HISTORY_LIMIT + 5 }, (_, i) => ({
      kind: "cup" as const,
      pick: i,
      hit: false,
    }));
    const rows = parseHistory(many);
    expect(rows).toHaveLength(HISTORY_LIMIT);
    expect(rows[rows.length - 1]).toEqual({ kind: "cup", pick: HISTORY_LIMIT + 4, hit: false });
  });
});

describe("attemptsRange", () => {
  // The rule that started this: with N cups, N−1 attempts wins by elimination,
  // so the budget has to stop below that. Three cups therefore means one lift.
  it("gives three cups exactly one attempt", () => {
    const range = attemptsRange("FIND_BALL", { cups: 3, digits: 3 });
    expect(range).toEqual({ min: 1, max: 1, fallback: 1 });
  });

  it("never lets a cups game be won by lifting everything", () => {
    for (let cups = CUPS_MIN; cups <= CUPS_MAX; cups++) {
      const { max } = attemptsRange("FIND_BALL", { cups, digits: 3 });
      // Leaves at least two cups the player never got to look under.
      expect(max).toBeLessThan(cups - 1);
    }
  });

  it("defaults a cups game to a single shot however many cups there are", () => {
    expect(attemptsRange("FIND_BALL", { cups: CUPS_MAX, digits: 3 }).fallback).toBe(1);
  });

  it("gives a three-digit safe five attempts, and scales with the code", () => {
    expect(attemptsRange("CRACK_SAFE", { cups: 3, digits: 3 }).fallback).toBe(5);
    expect(attemptsRange("CRACK_SAFE", { cups: 3, digits: 4 }).fallback).toBe(7);
    expect(attemptsRange("CRACK_SAFE", { cups: 3, digits: 5 }).fallback).toBe(9);
  });

  it("clamps the shape before deriving the range", () => {
    // An out-of-bounds shape must not widen the budget it implies.
    expect(attemptsRange("FIND_BALL", { cups: 99, digits: 3 }).max).toBe(CUPS_MAX - 2);
    expect(attemptsRange("CRACK_SAFE", { cups: 3, digits: 99 }).fallback).toBe(
      SAFE_DIGITS_MAX * 2 - 1
    );
  });
});

describe("clampAttempts", () => {
  it("pulls an over-generous cups budget back to what the shape allows", () => {
    // The admin form's old flat default: five attempts at three cups was a
    // guaranteed prize for anyone who clicked five times.
    expect(clampAttempts("FIND_BALL", { cups: 3, digits: 3 }, 5)).toBe(1);
    expect(clampAttempts("FIND_BALL", { cups: 6, digits: 3 }, 5)).toBe(4);
  });

  it("keeps a budget that is already in range", () => {
    expect(clampAttempts("CRACK_SAFE", { cups: 3, digits: 3 }, 8)).toBe(8);
    expect(clampAttempts("FIND_BALL", { cups: 6, digits: 3 }, 2)).toBe(2);
  });

  it("floors at one attempt", () => {
    expect(clampAttempts("CRACK_SAFE", { cups: 3, digits: 3 }, 0)).toBe(1);
    expect(clampAttempts("FIND_BALL", { cups: 5, digits: 3 }, -7)).toBe(1);
  });

  it("caps the safe at the hard ceiling", () => {
    expect(clampAttempts("CRACK_SAFE", { cups: 3, digits: 5 }, 9999)).toBe(ATTEMPTS_CEILING);
  });

  it("falls back to the shape's default when nothing usable was submitted", () => {
    expect(clampAttempts("FIND_BALL", { cups: 4, digits: 3 }, Number.NaN)).toBe(1);
    expect(clampAttempts("CRACK_SAFE", { cups: 3, digits: 3 }, Number.NaN)).toBe(5);
  });
});
