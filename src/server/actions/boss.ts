"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveEmpireId } from "@/lib/auth";
import { POLL_LIMIT, POLL_WINDOW_MS, localRateLimit } from "@/lib/rateLimit";
import {
  settleDueAssault,
  startBossAssault,
  type BossSortieOutcome,
} from "@/server/bossSiege";
import { getBossArenaState, type BossArenaState } from "@/server/bossBattleState";
import { logError } from "@/server/errorLog";

export interface BossActionState {
  error?: string;
}

/**
 * What the arena polls for. Either the assault is still running (`state`), or it
 * has settled and the report is ready (`fightId`).
 */
export interface BossArenaPoll {
  state?: BossArenaState | null;
  fightId?: string;
}

/**
 * Launch an assault on the city boss, then send the player in to watch it.
 *
 * This action owns exactly one thing the resolver does not: proving the caller
 * owns the empire being marched. `getActiveEmpireId` also enforces the ban and
 * email-verification gates, so the mutation surface is closed to accounts that
 * cannot load the page.
 */
export async function attackCityBoss(): Promise<BossActionState> {
  let outcome: BossSortieOutcome;

  try {
    const empireId = await getActiveEmpireId();
    if (empireId === null) return { error: "לא מחובר" };
    outcome = await startBossAssault(empireId);
    revalidatePath("/game", "layout");
  } catch (err) {
    await logError("boss.attackCityBoss", err);
    return { error: "אירעה שגיאה, נסה שוב" };
  }

  if ("error" in outcome) return outcome;
  // redirect() throws NEXT_REDIRECT — must run outside the try/catch above.
  redirect("/game/boss/battle");
}

/**
 * Read the running assault, settling it first if its clock has run out.
 *
 * The arena polls this while it watches. Settling here rather than waiting for the
 * player is what makes the minute honest — but it is not the only trigger: the
 * inbox poll does the same on every screen, so a player who wandered off is told
 * within one poll interval regardless (see `settleDueAssault`).
 */
export async function pollBossArena(): Promise<BossArenaPoll> {
  try {
    const empireId = await getActiveEmpireId();
    if (empireId === null) return {};

    // The fastest poll in the game (1.5s), and until this it had no upper bound at
    // all. Free to allow — see `localRateLimit` for why a read path gets the
    // in-process ceiling rather than the Postgres-counted one. A refused round is
    // indistinguishable from a slow one: the arena asks again immediately.
    if (!localRateLimit(`poll:arena:${empireId}`, POLL_LIMIT, POLL_WINDOW_MS)) {
      return {};
    }

    const settled = await settleDueAssault(empireId);
    if (settled) {
      // Resources, army and turns all moved; the layout's resource bar reads them
      // on every screen.
      revalidatePath("/game", "layout");
      return { fightId: settled.fightId };
    }
    return { state: await getBossArenaState(empireId) };
  } catch (err) {
    await logError("boss.pollBossArena", err);
    return {};
  }
}
