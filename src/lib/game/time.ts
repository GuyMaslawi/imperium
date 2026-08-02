import {
  DAILY_UPDATE_TIMES,
  GAME_TIMEZONE,
  REGULAR_TICK_MS,
} from "./constants";

interface WallParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: GAME_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Wall-clock parts of an instant in Asia/Jerusalem. */
function zonedParts(date: Date): WallParts {
  const parts: Partial<Record<string, number>> = {};
  for (const { type, value } of partsFormatter.formatToParts(date)) {
    if (type !== "literal") parts[type] = Number(value);
  }
  return {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    // Intl may report midnight as 24 with hour12: false.
    hour: (parts.hour ?? 0) % 24,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  };
}

/**
 * Convert an Asia/Jerusalem wall time to a UTC instant, accounting for DST.
 * Iterates on the offset guess until the round-trip matches.
 */
function wallTimeToUtc(wall: Omit<WallParts, "second">): Date {
  const desired = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  let ts = desired;
  for (let i = 0; i < 3; i++) {
    const roundTrip = zonedParts(new Date(ts));
    const got = Date.UTC(
      roundTrip.year,
      roundTrip.month - 1,
      roundTrip.day,
      roundTrip.hour,
      roundTrip.minute
    );
    if (got === desired) break;
    ts += desired - got;
  }
  return new Date(ts);
}

/** A Jerusalem wall-clock time of day, e.g. the 19:30 guild-war bell. */
export interface WallTime {
  hour: number;
  minute: number;
}

/** The instant at Jerusalem wall time `wall`, `dayOffset` days from `date`. */
function wallInstantForDay(date: Date, dayOffset: number, wall: WallTime): Date {
  const base = zonedParts(new Date(date.getTime() + dayOffset * 86_400_000));
  return wallTimeToUtc({
    year: base.year,
    month: base.month,
    day: base.day,
    hour: wall.hour,
    minute: wall.minute,
  });
}

/** The daily-update instants for the Jerusalem calendar day containing `date`, shifted by `dayOffset` days. */
function dailyInstantsForDay(date: Date, dayOffset: number): Date[] {
  return DAILY_UPDATE_TIMES.map((wall) => wallInstantForDay(date, dayOffset, wall));
}

/**
 * The first occurrence of Jerusalem wall time `wall` strictly after `after`.
 * Used by fixtures that fire once a day at their own hour rather than on a
 * daily-update boundary — the guild war bell (see src/lib/game/guildWar.ts).
 */
export function nextWallTime(after: Date, wall: WallTime): Date {
  for (let offset = 0; offset < 3; offset++) {
    const instant = wallInstantForDay(after, offset, wall);
    if (instant.getTime() > after.getTime()) return instant;
  }
  // Unreachable: within 2 days the time always comes round.
  return new Date(after.getTime() + 86_400_000);
}

/** The most recent occurrence of Jerusalem wall time `wall` at or before `date`. */
export function lastWallTime(date: Date, wall: WallTime): Date {
  for (let offset = 0; offset >= -2; offset--) {
    const instant = wallInstantForDay(date, offset, wall);
    if (instant.getTime() <= date.getTime()) return instant;
  }
  // Unreachable: within 2 days back the time has always just passed.
  return new Date(date.getTime() - 86_400_000);
}

/**
 * All daily-update instants in the interval (after, until].
 * Bounded to ~2 years of catch-up as a safety net.
 */
export function dailyUpdatesBetween(after: Date, until: Date): Date[] {
  const result: Date[] = [];
  const maxDays = 750;
  for (let offset = 0; offset <= maxDays; offset++) {
    const instants = dailyInstantsForDay(after, offset);
    let pastUntil = true;
    for (const instant of instants) {
      if (instant.getTime() > after.getTime() && instant.getTime() <= until.getTime()) {
        result.push(instant);
      }
      if (instant.getTime() <= until.getTime()) pastUntil = false;
    }
    if (pastUntil && offset > 0) break;
  }
  return result.sort((a, b) => a.getTime() - b.getTime());
}

/** The first daily-update instant strictly after `after`. */
export function nextDailyUpdate(after: Date): Date {
  for (let offset = 0; offset < 3; offset++) {
    for (const instant of dailyInstantsForDay(after, offset)) {
      if (instant.getTime() > after.getTime()) return instant;
    }
  }
  // Unreachable: within 2 days there is always an update.
  return new Date(after.getTime() + 86_400_000);
}

/**
 * Regular ticks are GLOBAL: they fire on round 5-minute wall-clock boundaries
 * (XX:00, XX:05, XX:10, …) shared by every empire, so the whole game — the
 * rankings included — updates at the same instant.
 */

/** The most recent global tick boundary at or before `date`. */
export function lastTickBoundary(date: Date): Date {
  return new Date(Math.floor(date.getTime() / REGULAR_TICK_MS) * REGULAR_TICK_MS);
}

/** The next global tick boundary strictly after `date` (XX:00, XX:05, …). */
export function nextRegularUpdate(date: Date): Date {
  return new Date(lastTickBoundary(date).getTime() + REGULAR_TICK_MS);
}

/** Global 5-minute boundaries crossed between the last update and now. */
export function elapsedRegularTicks(lastRegularUpdateAt: Date, now: Date): number {
  return Math.max(
    0,
    Math.floor(now.getTime() / REGULAR_TICK_MS) -
      Math.floor(lastRegularUpdateAt.getTime() / REGULAR_TICK_MS)
  );
}

/** The most recent daily-update instant at or before `date`. */
export function lastDailyUpdate(date: Date): Date {
  for (let offset = 0; offset >= -2; offset--) {
    const instants = dailyInstantsForDay(date, offset).filter(
      (instant) => instant.getTime() <= date.getTime()
    );
    if (instants.length > 0) return instants[instants.length - 1];
  }
  // Unreachable: within 2 days back there is always an update.
  return new Date(date.getTime() - 86_400_000);
}

/** Format an instant as Jerusalem wall time (HH:MM). */
export function formatGameTime(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: GAME_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Format an instant as a Jerusalem wall date and time (DD.MM.YYYY, HH:MM).
 *
 * The timezone is pinned rather than left to the host, because the callers that
 * need this are server-side (the Discord announcer) and a Vercel function runs
 * in UTC — a season deadline announced three hours early is a wrong deadline.
 */
export function formatGameDateTime(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: GAME_TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
