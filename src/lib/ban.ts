import type { Prisma } from "@prisma/client";

/**
 * The two columns that describe a ban: `bannedAt` is when it was handed down,
 * `bannedUntil` is when it lifts by itself — null meaning never (permanent).
 */
export interface BanState {
  bannedAt: Date | null;
  bannedUntil: Date | null;
}

/** Longest ban a day count may express (~10 years). Anything longer is permanent. */
export const BAN_DAYS_MAX = 3650;

/**
 * Is the account banned *right now*?
 *
 * Nothing sweeps expired rows — a timed ban stays on the user row after its
 * deadline passes — so every gate evaluates the deadline here instead of
 * reading `bannedAt` alone. `bannedAt` is a record, never a check.
 */
export function isBanned(user: BanState, now: Date = new Date()): boolean {
  if (!user.bannedAt) return false;
  return user.bannedUntil == null || user.bannedUntil > now;
}

/**
 * Prisma filter matching users whose ban is live. Mirrors `isBanned` exactly —
 * the two must move together, or a query would count a lapsed ban as active.
 */
export function bannedWhere(now: Date = new Date()): Prisma.UserWhereInput {
  return {
    bannedAt: { not: null },
    OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }],
  };
}

/** Prisma filter matching users who are not banned right now (inverse of `bannedWhere`). */
export function notBannedWhere(now: Date = new Date()): Prisma.UserWhereInput {
  return {
    OR: [{ bannedAt: null }, { bannedUntil: { lte: now } }],
  };
}

/** he-IL date+time, the one format every ban line is written in. */
export function formatBanDate(d: Date): string {
  return d.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
}

/**
 * The refusal shown to a banned player at the door. A timed ban names the hour
 * it lifts — without it the player has no way to tell a week from forever, and
 * every one of them writes to support.
 */
export function banNotice(user: BanState): string {
  return user.bannedUntil
    ? `החשבון נחסם על ידי ההנהלה עד ${formatBanDate(user.bannedUntil)}`
    : "החשבון נחסם על ידי ההנהלה";
}

/** Short admin-facing label for the current ban state. */
export function banLabel(user: BanState, now: Date = new Date()): string {
  if (!isBanned(user, now)) return "פעיל";
  return user.bannedUntil ? `באן עד ${formatBanDate(user.bannedUntil)}` : "באן קבוע";
}
