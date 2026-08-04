import { describe, expect, it } from "vitest";
import {
  breakToHours,
  isBreakUnit,
  nextSeasonName,
  nextSeasonWindow,
  seasonHeadline,
  seasonLengthMs,
  splitBreakHours,
} from "@/lib/game/seasonCycle";
import { formatBreakHours } from "@/components/admin/seasonBreak";
import { DEFAULT_TUNABLES, mergeTunables } from "@/lib/game/config";

/**
 * The season cycle turns with nobody watching it: a season seals itself on the
 * clock, books its successor, and that successor opens itself hours later and
 * wipes the world. Every number in that chain is written once, at 3am, by a
 * page load — so the two pure decisions in it (what the next season is called
 * and when it runs) are the ones worth pinning down here.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("nextSeasonName", () => {
  it("moves the season's number up by one", () => {
    expect(nextSeasonName("עונה 1", 1)).toBe("עונה 2");
    expect(nextSeasonName("עונה 9", 9)).toBe("עונה 10");
    expect(nextSeasonName("עונה 41", 41)).toBe("עונה 42");
  });

  it("keeps the written width of a padded number", () => {
    // "עונה 09" → "עונה 10", never "עונה 9" — the list would sort wrong and the
    // admin would be looking at two different naming schemes.
    expect(nextSeasonName("עונה 09", 9)).toBe("עונה 10");
    expect(nextSeasonName("Season 007", 7)).toBe("Season 008");
  });

  it("counts the seasons when the name carries no number at all", () => {
    expect(nextSeasonName("הבטא", 1)).toBe("עונה 2");
    expect(nextSeasonName("הבטא", 0)).toBe("עונה 1");
  });

  it("survives whitespace and a trailing suffix", () => {
    expect(nextSeasonName("  עונה 3  ", 3)).toBe("עונה 4");
    expect(nextSeasonName("עונה 3 (בטא)", 3)).toBe("עונה 4 (בטא)");
  });
});

describe("seasonHeadline", () => {
  it("writes the season the way an announcement says it", () => {
    expect(seasonHeadline("עונה 1")).toBe("העונה ה-1");
    expect(seasonHeadline("עונה 12")).toBe("העונה ה-12");
    // The padded form is a list label, not a sentence: "העונה ה-09" is not how
    // anybody reads it out loud.
    expect(seasonHeadline("עונה 09")).toBe("העונה ה-9");
    expect(seasonHeadline("  עונה 3  ")).toBe("העונה ה-3");
  });

  it("leaves a hand-written name alone", () => {
    // An admin who named the season meant that name — an article bolted onto it
    // reads as nonsense ("העונה ה-הבטא").
    expect(seasonHeadline("הבטא")).toBe("הבטא");
    expect(seasonHeadline("עונה 3 (בטא)")).toBe("עונה 3 (בטא)");
  });
});

describe("the break, typed in any unit", () => {
  it("stores whatever unit was chosen as hours", () => {
    expect(breakToHours(3, "days")).toBe(72);
    expect(breakToHours(90, "minutes")).toBe(1.5);
    expect(breakToHours(6, "hours")).toBe(6);
    expect(breakToHours(0, "days")).toBe(0);
  });

  it("reopens the field in the unit it was written in", () => {
    // "3 ימים" must not come back as "72 שעות" — an admin editing a month later
    // should see the sentence they wrote, not its arithmetic.
    expect(splitBreakHours(72)).toEqual({ value: 3, unit: "days" });
    expect(splitBreakHours(24)).toEqual({ value: 1, unit: "days" });
    expect(splitBreakHours(36)).toEqual({ value: 36, unit: "hours" });
    expect(splitBreakHours(0.5)).toEqual({ value: 30, unit: "minutes" });
    // Zero is "no break": hours, because "0 ימים" implies a unit was picked.
    expect(splitBreakHours(0)).toEqual({ value: 0, unit: "hours" });
  });

  it("round-trips every unit", () => {
    for (const [value, unit] of [
      [3, "days"],
      [10, "minutes"],
      [36, "hours"],
      [0, "hours"],
    ] as const) {
      const hours = breakToHours(value, unit);
      expect(splitBreakHours(hours)).toEqual({ value, unit });
    }
  });

  it("rejects anything that is not one of the three units", () => {
    expect(isBreakUnit("days")).toBe(true);
    for (const junk of ["weeks", "", null, undefined, 3, "DAYS"]) {
      expect(isBreakUnit(junk)).toBe(false);
    }
  });

  it("says it in Hebrew that counts one and two properly", () => {
    // "1 ימים" reads as a bug in the panel even when the number is right.
    expect(formatBreakHours(0)).toBe("ללא הפסקה");
    expect(formatBreakHours(24)).toBe("יום אחד");
    expect(formatBreakHours(48)).toBe("יומיים");
    expect(formatBreakHours(72)).toBe("3 ימים");
    expect(formatBreakHours(1)).toBe("שעה אחת");
    expect(formatBreakHours(2)).toBe("שעתיים");
    expect(formatBreakHours(36)).toBe("36 שעות");
    expect(formatBreakHours(1 / 60)).toBe("דקה אחת");
    expect(formatBreakHours(0.5)).toBe("30 דקות");
  });
});

describe("nextSeasonWindow", () => {
  const cycle = { breakHours: 24, lengthDays: 30 };

  it("opens the next season one break after this one ended", () => {
    const endsAt = new Date("2026-08-01T20:00:00.000Z");
    const window = nextSeasonWindow({ endsAt, closedAt: endsAt }, cycle);
    expect(window.startsAt.toISOString()).toBe("2026-08-02T20:00:00.000Z");
    expect(window.endsAt.getTime() - window.startsAt.getTime()).toBe(30 * DAY);
  });

  it("counts the break from the close, not the deadline it slept through", () => {
    // The close is lazy: on a quiet night the first page load past the deadline
    // can be hours late. Counting from `endsAt` there would eat the break — and
    // with a short enough one, reopen the game on the load that shut it.
    const endsAt = new Date("2026-08-01T20:00:00.000Z");
    const closedAt = new Date("2026-08-02T06:00:00.000Z");
    const window = nextSeasonWindow({ endsAt, closedAt }, cycle);
    expect(window.startsAt.toISOString()).toBe("2026-08-03T06:00:00.000Z");
  });

  it("ignores a close stamped before the deadline", () => {
    // An admin shortening a season pulls `endsAt` back to the past and closes
    // it; the later of the two is still what "ended" means.
    const endsAt = new Date("2026-08-01T20:00:00.000Z");
    const closedAt = new Date("2026-07-30T00:00:00.000Z");
    const window = nextSeasonWindow({ endsAt, closedAt }, cycle);
    expect(window.startsAt.toISOString()).toBe("2026-08-02T20:00:00.000Z");
  });

  it("opens immediately with a zero-hour break", () => {
    const endsAt = new Date("2026-08-01T20:00:00.000Z");
    const window = nextSeasonWindow(
      { endsAt, closedAt: endsAt },
      { breakHours: 0, lengthDays: 7 }
    );
    expect(window.startsAt.getTime()).toBe(endsAt.getTime());
    expect(window.endsAt.getTime()).toBe(endsAt.getTime() + 7 * DAY);
  });
});

describe("the cycle's tunables", () => {
  it("ships a cycle that actually turns", () => {
    expect(DEFAULT_TUNABLES.season.autoNext).toBe(1);
    expect(DEFAULT_TUNABLES.season.autoRestart).toBe(1);
    expect(DEFAULT_TUNABLES.season.lengthDays).toBeGreaterThan(0);
  });

  it("never lets a season be zero days long", () => {
    // A season whose end is its own start is closed by the gate on the page
    // load that opened it — the game would shut, reopen and shut again forever.
    for (const bad of [0, -1, -3650]) {
      expect(mergeTunables({ season: { lengthDays: bad } }).season.lengthDays)
        .toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps the break inside a year, and allows none at all", () => {
    expect(mergeTunables({ season: { breakHours: 0 } }).season.breakHours).toBe(0);
    expect(mergeTunables({ season: { breakHours: -5 } }).season.breakHours).toBe(0);
    expect(
      mergeTunables({ season: { breakHours: 1e9 } }).season.breakHours
    ).toBeLessThanOrEqual(8760);
  });

  it("reads its switches as off for anything under one", () => {
    // Same rule as boss.enabled and heroQuest.enabled: the read path tests
    // `>= 1`, so a stray 0.5 is "off" rather than half a season cycle.
    const merged = mergeTunables({ season: { autoNext: 0.5, autoRestart: 0 } });
    expect(merged.season.autoNext >= 1).toBe(false);
    expect(merged.season.autoRestart >= 1).toBe(false);
  });
});

describe("seasonLengthMs", () => {
  it("is days, in milliseconds", () => {
    expect(seasonLengthMs(1)).toBe(DAY);
    expect(seasonLengthMs(30)).toBe(30 * DAY);
  });
});
