import type { Prisma } from "@prisma/client";
import { lastDailyUpdate } from "@/lib/game/time";
import { SEASON_PASS_XP, type SeasonPassAction } from "@/lib/game/seasonPass";

/**
 * Add season-pass XP for a gameplay action.
 *
 * Deliberately NOT in a `"use server"` module: it takes a transaction client,
 * so it can only ever be called from server code inside an open transaction.
 * Exporting it from an actions file would publish it as a callable endpoint.
 *
 * Call it from inside the acting transaction so the XP and the action itself
 * commit together. It never throws — season-pass progress is a side benefit,
 * and a failure here must not roll back the attack or upgrade the player
 * actually asked for.
 */
export async function awardSeasonPassXp(
  tx: Prisma.TransactionClient,
  empireId: string,
  action: SeasonPassAction,
  times = 1
): Promise<void> {
  // `times` of 0 means the action earned nothing (a spend below the XP
  // threshold — see seasonPassSpendUnits) and must award nothing. Clamping to a
  // minimum of 1 here would hand the floor back to every micro-transaction and
  // undo the spend gate entirely.
  const units = Math.max(0, Math.floor(times));
  if (units === 0) return;

  const amount = SEASON_PASS_XP[action] * units;
  const cycleStart = lastDailyUpdate(new Date());

  try {
    // Stale row: fold the cycle reset and this award into a single write so the
    // XP lands in the new cycle instead of topping up the expired one.
    const rolled = await tx.seasonPassProgress.updateMany({
      where: { empireId, cycleStartedAt: { lt: cycleStart } },
      data: {
        cycleStartedAt: cycleStart,
        xp: amount,
        claimedFree: [],
        claimedPremium: [],
      },
    });
    if (rolled.count > 0) return;

    const bumped = await tx.seasonPassProgress.updateMany({
      where: { empireId, cycleStartedAt: cycleStart },
      data: { xp: { increment: amount } },
    });
    if (bumped.count > 0) return;

    // No row yet — first tracked action for this empire. seasonId is left null
    // and adopted by loadCycle on the next read; premium defaults to false, so
    // nothing can be lost by deferring it.
    //
    // upsert, not create: this runs inside the caller's transaction, and in
    // Postgres a failed statement poisons the whole transaction. Two of the
    // player's own concurrent actions both reach this line on a brand-new
    // empire; the loser would hit the unique index on empireId, and catching
    // that in JS does NOT recover the connection — Prisma wraps no savepoint
    // around individual statements, so every later statement returns 25P02 and
    // the enclosing $transaction rolls the player's real action back. upsert
    // compiles to ON CONFLICT, which resolves the race inside the statement.
    await tx.seasonPassProgress.upsert({
      where: { empireId },
      create: {
        empireId,
        cycleStartedAt: cycleStart,
        xp: amount,
        claimedFree: [],
        claimedPremium: [],
      },
      update: { xp: { increment: amount } },
    });
  } catch {
    // Any other hiccup — drop the XP rather than fail the player's action.
  }
}
