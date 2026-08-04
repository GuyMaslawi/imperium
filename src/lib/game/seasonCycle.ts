/**
 * The arithmetic of the season cycle — when the next season runs, and what it
 * is called.
 *
 * Pure on purpose. The rest of the cycle (sealing, archiving, wiping the world,
 * flipping the active flag) is transactional database work that can only be
 * tested against Postgres; these two decisions are not, and they are the two
 * that are read by players. A season that opens an hour late is a bug nobody
 * sees until the night it happens, so it gets tests that run on every save.
 *
 * See server/seasonClose.ts for the machinery that calls this.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/* --------------------------- the break, in words --------------------------- */

/**
 * The break between seasons is **stored in hours** and **typed in whatever unit
 * the admin is thinking in**.
 *
 * One stored unit, because everything downstream does arithmetic with it and a
 * column that sometimes means minutes is a bug waiting for a season boundary.
 * But "three days off" should not have to be typed as 72, and "let me test this
 * in ten minutes" should not have to be typed as 0.1667 — so the panel posts a
 * number plus a unit and this converts. Fractions of an hour are legitimate and
 * are kept: the cycle's date maths is millisecond-based throughout.
 */
export type BreakUnit = "minutes" | "hours" | "days";

/** Hours in one of each unit — the whole conversion table. */
const BREAK_UNIT_HOURS: Record<BreakUnit, number> = {
  minutes: 1 / 60,
  hours: 1,
  days: 24,
};

/** Is this string one of the three units? Anything else is not trusted. */
export function isBreakUnit(value: unknown): value is BreakUnit {
  return value === "minutes" || value === "hours" || value === "days";
}

/** A typed number and its unit, as the stored `breakHours`. */
export function breakToHours(value: number, unit: BreakUnit): number {
  return value * BREAK_UNIT_HOURS[unit];
}

/**
 * The stored hours, back in the largest unit that still divides evenly — so the
 * field re-opens saying "3 ימים" rather than "72 שעות", and an admin editing it
 * a month later sees the sentence they wrote, not its arithmetic.
 *
 * Zero is "no break at all"; it reads most naturally in hours, and reopening it
 * as "0 ימים" would suggest the unit had been chosen when it had not.
 */
export function splitBreakHours(hours: number): { value: number; unit: BreakUnit } {
  if (hours > 0 && hours % 24 === 0) return { value: hours / 24, unit: "days" };
  if (hours > 0 && hours < 1) return { value: Math.round(hours * 60), unit: "minutes" };
  return { value: hours, unit: "hours" };
}

/**
 * The name the season after this one gets: the same name with its number moved
 * up by one — "עונה 7" becomes "עונה 8".
 *
 * The season number is read out of the name rather than kept in a column of its
 * own, because the name is the only thing anybody sees: it is printed on the
 * recap, on every champion row in היכל התהילה and in the Discord post. A
 * separate counter could disagree with it, and then the game would be telling
 * players two different numbers for the same season.
 *
 * The written width is preserved ("עונה 09" → "עונה 10", not "עונה 9"), and a
 * name with no number in it at all falls back to counting the seasons that
 * exist, so an admin who called the first one "הבטא" still gets "עונה 2".
 */
export function nextSeasonName(previous: string, seasonCount: number): string {
  const match = /^(.*?)(\d+)(\D*)$/.exec(previous.trim());
  if (match) {
    const [, prefix, digits, suffix] = match;
    const raised = String(Number(digits) + 1);
    return `${prefix}${raised.padStart(digits.length, "0")}${suffix}`;
  }
  // i18n-exempt: written into GameSeason.name, so it is a proper noun from the
  // moment it lands — every recap, champion row and Discord post prints it.
  return `עונה ${Math.max(seasonCount, 0) + 1}`;
}

/**
 * A season's name as a headline reads it: "עונה 3" → "העונה ה-3".
 *
 * The stored name is a label in a list ("עונה 3" sorts and edits well in the
 * admin panel); a sentence announcing it to players wants the definite article,
 * because "עונה 3 הסתיימה" reads like a fragment and "העונה ה-3 הסתיימה" reads
 * like an announcement. Derived rather than stored as a second column for the
 * same reason `nextSeasonName` reads the number out of the name: one name, one
 * source of truth, no way for the two to disagree.
 *
 * A name that is not simply "<something> <number>" — "הבטא", "עונת הפתיחה" — is
 * handed back untouched. Bolting an article onto an arbitrary name produces
 * nonsense, and an admin who named a season by hand meant that name.
 */
export function seasonHeadline(name: string): string {
  const trimmed = name.trim();
  const match = /^\D*?(\d+)\s*$/.exec(trimmed);
  // i18n-exempt: goes into a stored Message title and a Discord post, both of
  // which are written once for every reader — see the note in `attackEmpire`.
  return match ? `העונה ה-${Number(match[1])}` : trimmed;
}

/**
 * When the next season runs: the break is counted from the moment the previous
 * season actually **ended**, and the length from there.
 *
 * "Actually ended" is the later of `endsAt` and `closedAt`, and the two are not
 * the same date. The close is lazy — it happens on the first page load past the
 * deadline, which on a quiet night can be hours later — and an admin shortening
 * a season sets `endsAt` into the past outright. Counting from `endsAt` alone
 * would then schedule an opening that is already overdue, and the game would
 * reopen on the same page load that shut it, with no break at all.
 */
export function nextSeasonWindow(
  previous: { endsAt: Date; closedAt: Date },
  cycle: { breakHours: number; lengthDays: number }
): { startsAt: Date; endsAt: Date } {
  const ended = Math.max(previous.endsAt.getTime(), previous.closedAt.getTime());
  const startsAt = new Date(ended + cycle.breakHours * HOUR_MS);
  return {
    startsAt,
    endsAt: new Date(startsAt.getTime() + cycle.lengthDays * DAY_MS),
  };
}

/** A season's full length in milliseconds, for a season pushed forward. */
export function seasonLengthMs(lengthDays: number): number {
  return lengthDays * DAY_MS;
}
