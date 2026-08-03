import type { Prisma } from "@prisma/client";
import { notStaff } from "./staff";

/**
 * Bot empires — where they count and where they do not.
 *
 * A bot is planted by an admin so that a city tier with one player in it still
 * has a war in it. Combat is confined to your own tier, so the first player to
 * climb into a high city can otherwise neither attack nor spy anybody until
 * someone else arrives.
 *
 * That makes a bot the exact opposite of a staff empire (src/lib/staff.ts),
 * which is hidden from every board *and* untouchable. A bot must be **visible
 * where it can be fought** — it stands in its city ladder like any resident,
 * because a target nobody can find is not a target — and absent from everything
 * that pays out or is remembered:
 *
 *   - the season podium and the diamond prizes it pays,
 *   - היכל התהילה and the season recap,
 *   - the world records (שיאי העולם),
 *   - the cross-game power / spy / slaves / bank / theft boards.
 *
 * The line between the two lists is "does this decide who won something". The
 * city ladder decides nothing; it is a map of who lives here. The podium hands
 * out 10,000 diamonds, and no diamond is ever going to a garrison.
 *
 * The flag lives on `Empire.isBot`, a plain column for the same reason
 * `isStaff` is one: every board is an indexed `ORDER BY … LIMIT` and a relation
 * filter on the `EmpireBot` row would turn each of them into a join.
 */

/**
 * Spread into any `where` that must not see bots but has its own view of staff
 * — in practice only the places that already say something else about them.
 * Almost every caller wants {@link notStaffOrBot} instead.
 */
export const notBot = { isBot: false } as const satisfies Prisma.EmpireWhereInput;

/**
 * The contestants: neither staff nor bots. This is what every board that ranks,
 * pays or archives filters on.
 *
 * Written as one fragment rather than `{ ...notStaff, ...notBot }` at two dozen
 * call sites so that the two exclusions can never be applied half-way — a board
 * that remembered staff and forgot bots would quietly hand a garrison a podium
 * seat.
 */
export const notStaffOrBot = {
  ...notStaff,
  ...notBot,
} as const satisfies Prisma.EmpireWhereInput;

/** The same exclusion nested under a relation (a guild's members, a report's attacker). */
export const notStaffOrBotEmpire = { empire: notStaffOrBot } as const;

/** Is this empire a planted garrison rather than a player? */
export function isBotEmpire(empire: { isBot: boolean }): boolean {
  return empire.isBot;
}
