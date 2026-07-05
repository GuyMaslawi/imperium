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

/** The daily-update instants for the Jerusalem calendar day containing `date`, shifted by `dayOffset` days. */
function dailyInstantsForDay(date: Date, dayOffset: number): Date[] {
  const base = zonedParts(new Date(date.getTime() + dayOffset * 86_400_000));
  return DAILY_UPDATE_TIMES.map(({ hour, minute }) =>
    wallTimeToUtc({ year: base.year, month: base.month, day: base.day, hour, minute })
  );
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

/** The next regular tick boundary after `lastRegularUpdateAt`. */
export function nextRegularUpdate(lastRegularUpdateAt: Date): Date {
  return new Date(lastRegularUpdateAt.getTime() + REGULAR_TICK_MS);
}

/** Full 5-minute ticks elapsed between the last update and now. */
export function elapsedRegularTicks(lastRegularUpdateAt: Date, now: Date): number {
  return Math.max(
    0,
    Math.floor((now.getTime() - lastRegularUpdateAt.getTime()) / REGULAR_TICK_MS)
  );
}

/** Format an instant as Jerusalem wall time (HH:MM). */
export function formatGameTime(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: GAME_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
