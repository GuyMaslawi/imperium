import { describe, expect, it } from "vitest";
import { banLabel, banNotice, bannedWhere, isBanned, notBannedWhere } from "@/lib/ban";

/**
 * A ban is two columns and one rule, and every gate in the app (login, the /game
 * page guards, every server action through getActiveEmpireId, the attack target
 * check, the message roster) leans on that rule. The dangerous half is the SQL
 * filters: they are a *second* implementation of `isBanned`, so these tests pin
 * them to it — a filter that drifted would silently let a banned account back
 * into the address book, or keep a lapsed one out of it forever.
 */

const NOW = new Date("2026-07-29T12:00:00.000Z");
const PAST = new Date("2026-07-28T12:00:00.000Z");
const FUTURE = new Date("2026-08-05T12:00:00.000Z");

describe("isBanned", () => {
  it("is false for an account that was never banned", () => {
    expect(isBanned({ bannedAt: null, bannedUntil: null }, NOW)).toBe(false);
  });

  it("is true forever when there is no deadline", () => {
    expect(isBanned({ bannedAt: PAST, bannedUntil: null }, NOW)).toBe(true);
  });

  it("is true while the deadline is still ahead", () => {
    expect(isBanned({ bannedAt: PAST, bannedUntil: FUTURE }, NOW)).toBe(true);
  });

  it("lapses the moment the deadline passes, with the row left in place", () => {
    expect(isBanned({ bannedAt: PAST, bannedUntil: NOW }, NOW)).toBe(false);
    expect(isBanned({ bannedAt: PAST, bannedUntil: PAST }, NOW)).toBe(false);
  });

  it("ignores a deadline with no ban behind it", () => {
    expect(isBanned({ bannedAt: null, bannedUntil: FUTURE }, NOW)).toBe(false);
  });
});

/** Evaluate the Prisma filters the way Postgres would, over one row. */
function matchesBanned(user: { bannedAt: Date | null; bannedUntil: Date | null }): boolean {
  const w = bannedWhere(NOW);
  const notNull = user.bannedAt !== null; // bannedAt: { not: null }
  const or = w.OR as { bannedUntil: null | { gt: Date } }[];
  const untilOk = or.some((clause) =>
    clause.bannedUntil === null
      ? user.bannedUntil === null
      : user.bannedUntil !== null && user.bannedUntil > clause.bannedUntil.gt
  );
  return notNull && untilOk;
}

function matchesNotBanned(user: { bannedAt: Date | null; bannedUntil: Date | null }): boolean {
  const or = notBannedWhere(NOW).OR as { bannedAt?: null; bannedUntil?: { lte: Date } }[];
  return or.some((clause) =>
    "bannedAt" in clause
      ? user.bannedAt === null
      : user.bannedUntil !== null && user.bannedUntil <= clause.bannedUntil!.lte
  );
}

describe("ban filters mirror isBanned", () => {
  const rows = [
    { bannedAt: null, bannedUntil: null },
    { bannedAt: PAST, bannedUntil: null },
    { bannedAt: PAST, bannedUntil: FUTURE },
    { bannedAt: PAST, bannedUntil: PAST },
    { bannedAt: PAST, bannedUntil: NOW },
  ];

  it("bannedWhere matches exactly the live bans", () => {
    for (const row of rows) expect(matchesBanned(row)).toBe(isBanned(row, NOW));
  });

  it("notBannedWhere is its exact complement", () => {
    for (const row of rows) expect(matchesNotBanned(row)).toBe(!isBanned(row, NOW));
  });
});

describe("copy", () => {
  it("names the hour a timed ban lifts, and stays silent for a permanent one", () => {
    expect(banNotice({ bannedAt: PAST, bannedUntil: FUTURE })).toContain("עד");
    expect(banNotice({ bannedAt: PAST, bannedUntil: null })).not.toContain("עד");
  });

  it("labels a lapsed ban as active", () => {
    expect(banLabel({ bannedAt: PAST, bannedUntil: PAST }, NOW)).toBe("פעיל");
    expect(banLabel({ bannedAt: PAST, bannedUntil: null }, NOW)).toBe("באן קבוע");
  });
});
