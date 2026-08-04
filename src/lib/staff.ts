import type { T } from "@/i18n/translate";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Staff accounts — the admins' own empires — are not contestants.
 *
 * An admin needs a real empire to walk the game the way a player does, but that
 * empire holds an unfair hand: it can be gifted resources, it can be edited
 * outright, and it sees everyone's numbers. So it is fenced off from the
 * competition on both sides —
 *
 *   - nobody can attack or spy it (it is not loot, and a raid on it proves
 *     nothing about either army);
 *   - it never appears in a ranked or archived view: the city ladder, the
 *     cross-game power and spy boards, the world records, the medal case, the
 *     guild-war roster, the season podium and the hall of fame.
 *
 * The flag lives on `Empire.isStaff`, denormalised from `User.role`. Every
 * board is an indexed `ORDER BY … LIMIT`; a predicate on the same table keeps
 * it that way, where a join to User would not. `syncStaffFlag` is the one
 * writer, called wherever a role changes.
 */

/**
 * Spread into any `where` that must not see staff. Written as a fragment rather
 * than a helper call so it composes with the filters a board already has:
 *
 *   where: { ...notStaff, seasonId, cities: tier }
 *
 * `false` rather than `{ not: true }` on purpose — the column is NOT NULL, and
 * an equality predicate is what the composite indexes are built to serve.
 */
export const notStaff = { isStaff: false } as const satisfies Prisma.EmpireWhereInput;

/**
 * The same exclusion for a query that reaches empires *through* a relation —
 * a guild's members, a season's board entries — where the filter has to be
 * nested under the relation name instead of spread at the top level.
 */
export const notStaffEmpire = { empire: notStaff } as const;

/**
 * Why a staff empire is untouchable, in the player's words. Deliberately says
 * "הנהלה" rather than naming a shield: this is not a timer that will run out,
 * and a player who keeps checking back is a player wasting turns.
 */
export function staffTargetRefusal(t: T): string {
  return t("האימפריה הזו שייכת להנהלת המשחק — לא ניתן לתקוף או לרגל אותה.");
}

/** Is this empire out of the game? Accepts anything carrying the flag. */
export function isStaffEmpire(empire: { isStaff: boolean }): boolean {
  return empire.isStaff;
}

/**
 * Point `Empire.isStaff` at the account's role.
 *
 * Called from every place a role can change — the admin role editor and
 * scripts/grant-admin.ts. A guarded `updateMany` rather than an `update`
 * because the user may not have an empire yet (a fresh admin who never
 * registered one); `update` would throw on the missing row, and there is
 * nothing to fix in that case. Re-running it is always safe, which makes it
 * the repair for a drifted flag as well as the writer.
 *
 * Note this only ever *follows* the role. Demoting an admin puts their empire
 * back into the game with whatever it accumulated while it was out — which is
 * why the role is not something to hand around casually.
 */
export async function syncStaffFlag(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  role: "ADMIN" | "USER"
): Promise<void> {
  await db.empire.updateMany({
    where: { userId },
    data: { isStaff: role === "ADMIN" },
  });
}
