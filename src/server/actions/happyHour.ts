"use server";

import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { getLiveHappyHour } from "@/server/happyHour";
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
 * poll that noticed — guarded by `isActive` so concurrent readers don't all
 * write the same row.
 */
export async function getHappyHourState(): Promise<HappyHourState | null> {
  // Enforces the ban on the poll as well as on page loads (see getActiveEmpireId).
  const empireId = await getActiveEmpireId();
  if (!empireId) return null;

  const now = new Date();
  const live = await getLiveHappyHour(undefined, now);
  if (live) return toState(live, now);

  await prisma.happyHour.updateMany({
    where: { isActive: true, endsAt: { lte: now } },
    data: { isActive: false, endedAt: now },
  });
  return null;
}
