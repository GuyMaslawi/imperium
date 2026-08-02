import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  effectiveMineTicks,
  happyHourMultiplier,
  type HappyHourWindow,
} from "@/lib/game/happyHour";

/**
 * Reading Happy Hour. The window is enforced here, on the clock, in exactly the
 * way potion windows are (lib/game/potionEffects.ts): nothing runs on a
 * schedule, every reader filters on `startsAt`/`endsAt`, and a release
 * therefore ends on time whether or not anybody is logged in.
 *
 * None of these functions write. A release whose deadline has passed keeps its
 * stale `isActive` flag until an admin screen or the player-facing poll flips it
 * (see server/actions/happyHour.ts) — the flag is bookkeeping, the clock is the
 * rule, and a gameplay read must never turn into a write on the hot path.
 */

/**
 * Every column a window needs to be read as gameplay, and nothing else. Exported
 * because the player-facing poll (server/actions/happyHour.ts) reads the same
 * row without the clock filter — see `getHappyHourState` for why.
 */
export const HAPPY_HOUR_SELECT = {
  id: true,
  title: true,
  bonusPct: true,
  boostXp: true,
  boostPlunder: true,
  boostMines: true,
  startsAt: true,
  endsAt: true,
} satisfies Prisma.HappyHourSelect;

const WINDOW_SELECT = HAPPY_HOUR_SELECT;

/** Rows are only ever released with a `startsAt`; this narrows the nullable column. */
type WindowRow = Prisma.HappyHourGetPayload<{ select: typeof WINDOW_SELECT }>;

function toWindow(row: WindowRow): HappyHourWindow | null {
  if (!row.startsAt) return null;
  return { ...row, startsAt: row.startsAt };
}

/**
 * The window in force right now, or null. At most one is ever live — releasing
 * a window closes every other — but the ordering makes the newest win rather
 * than depending on that invariant holding.
 */
export async function getLiveHappyHour(
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date()
): Promise<HappyHourWindow | null> {
  const row = await tx.happyHour.findFirst({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { startsAt: "desc" },
    select: WINDOW_SELECT,
  });
  return row ? toWindow(row) : null;
}

/**
 * The live multiplier for one kind of gain, or 1 when no window is running (or
 * the running one leaves that rule alone). This is the whole gameplay surface:
 * every call site multiplies by it and needs to know nothing else.
 */
export function happyHourFactor(
  window: HappyHourWindow | null,
  effect: "boostXp" | "boostPlunder"
): number {
  if (!window || !window[effect]) return 1;
  return happyHourMultiplier(window.bonusPct);
}

/**
 * The production ticks a mine backlog should actually be paid for.
 *
 * Unlike XP and plunder — which are settled the instant they are earned, so a
 * single "is a window live?" answers them — mine output is settled lazily in
 * arrears. A player logging in at noon may be claiming ticks from midnight, and
 * only the ones that fell inside a window may be boosted. So this looks up every
 * window *overlapping the backlog*, closed ones included, and prices each tick
 * against the window it belongs to. See effectiveMineTicks.
 */
export async function mineTicksWithHappyHour(
  ticks: number,
  lastRegularUpdateAt: Date,
  now: Date,
  tx: Prisma.TransactionClient = prisma
): Promise<number> {
  if (ticks <= 0) return ticks;

  const windows = await tx.happyHour.findMany({
    where: {
      boostMines: true,
      startsAt: { not: null, lt: now },
      // Overlaps the settled stretch: it either has not closed yet, or it closed
      // after the last settlement. An open-ended window that is no longer active
      // was stopped by hand, and stopping writes `endsAt`, so `endsAt: null`
      // here really does mean "still running".
      OR: [{ endsAt: null, isActive: true }, { endsAt: { gt: lastRegularUpdateAt } }],
    },
    select: { bonusPct: true, startsAt: true, endsAt: true },
  });
  if (windows.length === 0) return ticks;

  return effectiveMineTicks(
    ticks,
    lastRegularUpdateAt.getTime(),
    now.getTime(),
    // startsAt is non-null by the filter above; the column is nullable only
    // because a row exists before it is ever released.
    windows.filter((w): w is typeof w & { startsAt: Date } => w.startsAt !== null)
  );
}
