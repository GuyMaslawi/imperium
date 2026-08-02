"use server";

import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { POLL_LIMIT, POLL_WINDOW_MS, localRateLimit } from "@/lib/rateLimit";
import { HAPPY_HOUR_SELECT } from "@/server/happyHour";
import {
  happyHourMultiplier,
  multiplierLabel,
  type HappyHourWindow,
} from "@/lib/game/happyHour";

/**
 * What the banner on every game screen renders. Everything here is public — the
 * window is the same for every player in the world, so there is nothing to
 * scope to the viewer beyond checking they are a player at all.
 */
export interface HappyHourState {
  id: string;
  title: string;
  bonusPct: number;
  multiplier: number;
  multiplierLabel: string;
  boostXp: boolean;
  boostPlunder: boolean;
  boostMines: boolean;
  startedAt: number;
  /** null = open-ended, until an admin calls it off. */
  endsAt: number | null;
  /** The countdown runs on server time; see the banner's Countdown. */
  serverNow: number;
}

function toState(window: HappyHourWindow, now: Date): HappyHourState {
  return {
    id: window.id,
    title: window.title,
    bonusPct: window.bonusPct,
    multiplier: happyHourMultiplier(window.bonusPct),
    multiplierLabel: multiplierLabel(window.bonusPct),
    boostXp: window.boostXp,
    boostPlunder: window.boostPlunder,
    boostMines: window.boostMines,
    startedAt: window.startsAt.getTime(),
    endsAt: window.endsAt?.getTime() ?? null,
    serverNow: now.getTime(),
  };
}

/**
 * The live window, or null. This is also the one place that retires an expired
 * release: gameplay reads filter on the clock and never write (see
 * server/happyHour.ts), so the stale `isActive` flag is cleaned up here, on the
 * read that noticed — guarded by `isActive` so concurrent readers don't all
 * write the same row.
 *
 * **One statement in the common case, and never a write in it.** The obvious
 * shape — ask for a *live* window, and if there is none clean up after an
 * expired one — puts an `UPDATE` on the hot path: "no window is running" is the
 * normal state of the game, so every poll from every player would open a write
 * transaction to match zero rows. So the clock filter comes off the query and
 * goes into JS: the newest released row is fetched whatever its deadline, and
 * only a row that is genuinely past it is written back. No release running at
 * all means one indexed `SELECT` that returns nothing.
 */
export async function getHappyHourState(): Promise<HappyHourState | null> {
  // Enforces the ban on the poll as well as on page loads (see getActiveEmpireId).
  const empireId = await getActiveEmpireId();
  if (!empireId) return null;

  const now = new Date();
  const row = await prisma.happyHour.findFirst({
    where: { isActive: true, startsAt: { lte: now } },
    orderBy: { startsAt: "desc" },
    select: HAPPY_HOUR_SELECT,
  });
  if (!row?.startsAt) return null;

  if (row.endsAt == null || row.endsAt > now) {
    return toState({ ...row, startsAt: row.startsAt }, now);
  }

  // Past its deadline: retire the flag on the read that noticed. Guarded on
  // `isActive` so a hundred concurrent pollers write it once.
  await prisma.happyHour.updateMany({
    where: { id: row.id, isActive: true },
    data: { isActive: false, endedAt: now },
  });
  return null;
}

/** What the banner's poll gets back. Mirrors `pollBossArena`'s shape. */
export interface HappyHourPoll {
  state?: HappyHourState | null;
  /** Nothing was learned this round; ask again, change nothing. */
  retry?: boolean;
}

/**
 * The banner's polled read — `getHappyHourState` with a ceiling on it.
 *
 * The banner is mounted in the game layout, so this runs on every screen for
 * every signed-in player, forever. Same reasoning (and same free in-process
 * counter) as the chat panes and the boss arena: there is no secret behind it,
 * so the ceiling is not a security boundary — it exists so a looping client
 * cannot turn a layout-level poll into unbounded database load.
 *
 * A refused round is `retry`, never an empty state: the poller must not read a
 * throttled answer as "the window closed" and tear a live banner off the screen.
 * The server-rendered path (the layout) calls `getHappyHourState` directly and
 * is deliberately not counted here.
 */
export async function pollHappyHour(): Promise<HappyHourPoll> {
  const empireId = await getActiveEmpireId();
  if (!empireId) return { retry: true };
  if (!localRateLimit(`poll:happy:${empireId}`, POLL_LIMIT, POLL_WINDOW_MS)) {
    return { retry: true };
  }
  return { state: await getHappyHourState() };
}
