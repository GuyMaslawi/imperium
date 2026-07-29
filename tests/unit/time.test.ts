import { describe, expect, it } from "vitest";
import { lastWallTime, nextWallTime, type WallTime } from "@/lib/game/time";

/**
 * The wall-clock helpers are load-bearing for the guild war: the bell is stored
 * as an exact instant and looked up with `findUnique({ startsAt })`, so if
 * `nextWallTime` and `lastWallTime` ever disagreed by a single millisecond the
 * war row would be written and then never found again — no rounds, no
 * settlement, and no error anywhere to say so.
 */

const BELL: WallTime = { hour: 19, minute: 30 };

/** Israel moves to DST in late March and back in late October. */
const BEFORE_DST_START = new Date("2026-03-26T12:00:00.000Z");
const AFTER_DST_END = new Date("2026-10-26T12:00:00.000Z");

describe("nextWallTime", () => {
  it("always lands strictly in the future", () => {
    for (const now of [
      new Date("2026-07-30T07:00:00.000Z"),
      new Date("2026-07-30T16:29:59.999Z"),
      new Date("2026-07-30T16:30:00.000Z"),
      new Date("2026-07-30T23:59:59.000Z"),
    ]) {
      expect(nextWallTime(now, BELL).getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("lands on a whole minute — no seconds, no milliseconds", () => {
    // Exact equality is what the unique index on `startsAt` relies on.
    const t = nextWallTime(new Date("2026-07-30T07:00:00.000Z"), BELL);
    expect(t.getSeconds()).toBe(0);
    expect(t.getMilliseconds()).toBe(0);
  });

  it("skips to tomorrow once today's bell has rung", () => {
    const before = nextWallTime(new Date("2026-07-30T07:00:00.000Z"), BELL);
    const after = nextWallTime(new Date("2026-07-30T18:00:00.000Z"), BELL);
    expect(after.getTime()).toBeGreaterThan(before.getTime());
    expect(after.getTime() - before.getTime()).toBeGreaterThanOrEqual(23 * 3_600_000);
    expect(after.getTime() - before.getTime()).toBeLessThanOrEqual(25 * 3_600_000);
  });
});

describe("lastWallTime", () => {
  it("always lands at or before the moment asked about", () => {
    for (const now of [
      new Date("2026-07-30T07:00:00.000Z"),
      new Date("2026-07-30T16:31:00.000Z"),
      new Date("2026-12-31T22:00:00.000Z"),
    ]) {
      expect(lastWallTime(now, BELL).getTime()).toBeLessThanOrEqual(now.getTime());
    }
  });

  it("is never more than a day behind", () => {
    const now = new Date("2026-07-30T07:00:00.000Z");
    expect(now.getTime() - lastWallTime(now, BELL).getTime()).toBeLessThan(
      25 * 3_600_000
    );
  });
});

describe("the two agree", () => {
  it("round-trips: the bell booked by registration is the bell the war finds", () => {
    for (const now of [
      new Date("2026-07-30T07:00:00.000Z"),
      new Date("2026-01-15T20:00:00.000Z"),
      BEFORE_DST_START,
      AFTER_DST_END,
    ]) {
      const booked = nextWallTime(now, BELL);
      // A minute into the window, the "current" bell must be the booked one.
      expect(lastWallTime(new Date(booked.getTime() + 60_000), BELL).getTime()).toBe(
        booked.getTime()
      );
    }
  });

  it("survives both daylight-saving transitions", () => {
    // The instants shift by an hour of UTC across a transition; what must not
    // change is that the two helpers still name the same instant.
    for (const now of [BEFORE_DST_START, AFTER_DST_END]) {
      const booked = nextWallTime(now, BELL);
      const next = nextWallTime(booked, BELL);
      const gap = next.getTime() - booked.getTime();
      // 23, 24 or 25 hours depending on which side of the change we crossed.
      expect(gap).toBeGreaterThanOrEqual(23 * 3_600_000);
      expect(gap).toBeLessThanOrEqual(25 * 3_600_000);
      expect(lastWallTime(new Date(booked.getTime() + 1), BELL).getTime()).toBe(
        booked.getTime()
      );
    }
  });

  it("handles midnight as a wall time", () => {
    const midnight: WallTime = { hour: 0, minute: 0 };
    const now = new Date("2026-07-30T10:00:00.000Z");
    const next = nextWallTime(now, midnight);
    expect(next.getTime()).toBeGreaterThan(now.getTime());
    expect(lastWallTime(new Date(next.getTime() + 1), midnight).getTime()).toBe(
      next.getTime()
    );
  });
});
