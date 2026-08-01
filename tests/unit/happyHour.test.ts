import { describe, expect, it } from "vitest";
import {
  boostedTickCount,
  effectiveMineTicks,
  happyHourMultiplier,
  multiplierLabel,
} from "@/lib/game/happyHour";
import { REGULAR_TICK_MS } from "@/lib/game/constants";

/**
 * The mine half of Happy Hour is the only part of it that is not a plain
 * multiplication, and it is the part with an exploit under it.
 *
 * Production is settled lazily: a player who was away all night claims the whole
 * backlog on their next page load. If the live bonus were simply applied to that
 * backlog, staying logged out until a golden hour opened would pay the golden
 * rate on a night of ordinary mining — which turns an event meant to pull people
 * *into* the game into a reason to stay out of it. So each 5-minute tick is
 * priced against the window its own boundary fell in.
 */

const T = REGULAR_TICK_MS;

/** Tick boundary `n` as an epoch instant — the same index the clock uses. */
const at = (n: number) => n * T;

describe("happyHourMultiplier", () => {
  it("reads a percent as a multiplier", () => {
    expect(happyHourMultiplier(0)).toBe(1);
    expect(happyHourMultiplier(100)).toBe(2);
    expect(happyHourMultiplier(50)).toBe(1.5);
    expect(happyHourMultiplier(900)).toBe(10);
  });

  it("labels round multipliers without trailing zeros", () => {
    expect(multiplierLabel(100)).toBe("×2");
    expect(multiplierLabel(900)).toBe("×10");
    expect(multiplierLabel(50)).toBe("×1.5");
  });
});

describe("boostedTickCount", () => {
  it("counts every tick when the window covers the whole backlog", () => {
    expect(boostedTickCount(at(100), at(110), at(90), at(120))).toBe(10);
  });

  it("counts none when the window closed before the backlog began", () => {
    // The exploit this whole function exists to close: away all night, log in
    // during a golden hour that has already ended.
    expect(boostedTickCount(at(100), at(110), at(50), at(80))).toBe(0);
  });

  it("counts none when the window opens after the backlog was settled", () => {
    expect(boostedTickCount(at(100), at(110), at(200), at(220))).toBe(0);
  });

  it("counts only the overlap when the window starts mid-backlog", () => {
    // Opened *on* boundary 106, so the first boosted tick is 107: the one that
    // just landed was mined before the announcement.
    expect(boostedTickCount(at(100), at(110), at(106), at(120))).toBe(4);
  });

  it("counts only the overlap when the window ends mid-backlog", () => {
    // Closed on boundary 106, which pays that tick in full: 101…106.
    expect(boostedTickCount(at(100), at(110), at(90), at(106))).toBe(6);
  });

  it("pays a window exactly as many ticks as it ran", () => {
    // Twelve ticks of wall clock, opened and closed on a boundary — the number
    // an admin who released "an hour" would count if they counted by hand.
    expect(boostedTickCount(at(0), at(200), at(100), at(112))).toBe(12);
  });

  it("runs to the end of the backlog for an open-ended window", () => {
    expect(boostedTickCount(at(100), at(110), at(104), null)).toBe(6);
  });

  it("is empty when no boundary has been crossed", () => {
    expect(boostedTickCount(at(100), at(100) + 1, at(0), null)).toBe(0);
  });

  it("ignores the part of a window that predates the backlog", () => {
    // A window running since long before the player's last settlement pays for
    // the settled ticks only — never for time the player was already paid for.
    expect(boostedTickCount(at(100), at(103), at(0), null)).toBe(3);
  });

  it("never counts a tick twice at the seam of two windows", () => {
    // Back-to-back windows meeting exactly on boundary 105: the tick at 105
    // belongs to the second (start is inclusive, end exclusive), not to both.
    const first = boostedTickCount(at(100), at(110), at(100), at(105));
    const second = boostedTickCount(at(100), at(110), at(105), at(110));
    expect(first).toBe(5);
    expect(second).toBe(5);
    expect(first + second).toBe(10);
  });
});

describe("effectiveMineTicks", () => {
  const window = (bonusPct: number, from: number, to: number | null) => ({
    bonusPct,
    startsAt: new Date(at(from)),
    endsAt: to == null ? null : new Date(at(to)),
  });

  it("is the plain tick count with no windows at all", () => {
    expect(effectiveMineTicks(10, at(100), at(110), [])).toBe(10);
  });

  it("doubles a backlog spent entirely inside a ×2 window", () => {
    expect(effectiveMineTicks(10, at(100), at(110), [window(100, 90, 120)])).toBe(20);
  });

  it("pays the bonus only on the ticks that fell inside the window", () => {
    // Four of the ten ticks boosted at ×2 ⇒ 10 ordinary + 4 extra.
    expect(effectiveMineTicks(10, at(100), at(110), [window(100, 106, 120)])).toBe(14);
  });

  it("scales with the bonus", () => {
    // ×10 over the whole backlog.
    expect(effectiveMineTicks(10, at(100), at(110), [window(900, 90, 120)])).toBe(100);
  });

  it("adds up two windows that both touched the backlog", () => {
    const settled = effectiveMineTicks(10, at(100), at(110), [
      window(100, 100, 105), // ×2 over 5 ticks → +5
      window(300, 105, 110), // ×4 over 5 ticks → +15
    ]);
    expect(settled).toBe(30);
  });

  it("leaves an empty backlog alone", () => {
    expect(effectiveMineTicks(0, at(100), at(100), [window(100, 0, null)])).toBe(0);
  });
});
