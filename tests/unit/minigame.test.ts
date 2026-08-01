import { describe, it, expect } from "vitest";
import { scoreCode, parseHistory, HISTORY_LIMIT } from "@/lib/game/minigame";

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
