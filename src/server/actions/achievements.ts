"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import { grantCitizens } from "@/lib/game/grants";
import {
  ACHIEVEMENTS,
  isAchievementReached,
  mergeRewards,
  type AchievementDefinition,
  type AchievementRewardKind,
  type AchievementRewardTotal,
} from "@/lib/game/achievements";
import { gatherAchievementStats, getClaimedKeys } from "@/server/achievementState";

/**
 * No ladder is returned on success: `revalidatePath` re-renders the page from
 * the database, which is the single source of truth the client renders from.
 * What does come back is the payout summary, already merged per resource so
 * the client can render it as icons instead of a sentence.
 */
export interface ClaimAchievementsResult {
  ok: boolean;
  error?: string;
  /** How many achievements were collected in this batch. */
  count?: number;
  /** One entry per resource, summed across the whole batch. */
  totals?: AchievementRewardTotal[];
}

/** Credit one achievement's reward to the empire. */
async function grantReward(
  tx: Prisma.TransactionClient,
  empireId: string,
  a: AchievementDefinition
): Promise<void> {
  const { kind, amount } = a.reward;
  if (kind === "citizens") {
    // Citizens are ceilinged by city count; a raw increment would breach the cap
    // the daily update enforces, and citizens convert into mine slaves — an
    // uncapped citizen faucet is an uncapped resource faucet. See grantCitizens.
    await grantCitizens(tx, empireId, amount);
  } else {
    await tx.empire.update({
      where: { id: empireId },
      data: { [kind]: { increment: amount } },
    });
  }
}

/**
 * Collect every unlocked, uncollected achievement.
 *
 * Conditions are re-evaluated here straight from the database rather than
 * trusted from the caller, so a client cannot claim a reward it has not earned.
 *
 * The receipt row is inserted *before* the payout, and the unique constraint on
 * `(empireId, key)` is what makes a double-submit a no-op: two concurrent
 * claims race on the insert, and the loser sees P2002 and skips the credit
 * entirely. Every reward is a plain resource increment that cannot fail to
 * land, so there is no case where a receipt exists but nothing was paid.
 */
export async function claimAchievements(): Promise<ClaimAchievementsResult> {
  try {
    // Enforces the ban/verification gate on the action too, not just page loads.
    const empireId = await getActiveEmpireId();
    if (empireId === null) return { ok: false, error: "לא מחובר" };

    const result = await prisma.$transaction(async (tx) => {
      // Settle pending updates first, so a milestone the player crossed via an
      // unsettled update (citizens, production) counts on this very claim.
      await applyPendingUpdates(empireId, tx);

      const claimedKeys = await getClaimedKeys(tx, empireId);
      const stats = await gatherAchievementStats(tx, empireId, claimedKeys);
      if (!stats) return { ok: false as const, error: "האימפריה לא נמצאה" };

      const granted: { kind: AchievementRewardKind; amount: number }[] = [];
      for (const a of ACHIEVEMENTS) {
        if (claimedKeys.has(a.key)) continue;
        // Positive test on purpose: `progress < goal` would let an absent or
        // NaN stat through, because comparisons against NaN are always false.
        // See achievementProgress.
        if (!isAchievementReached(a, stats)) continue;

        try {
          await tx.empireAchievement.create({ data: { empireId, key: a.key } });
        } catch (err) {
          // Lost the race with a concurrent claim — it already paid this one out.
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
            continue;
          }
          throw err;
        }
        await grantReward(tx, empireId, a);
        granted.push(a.reward);
      }

      if (granted.length === 0) {
        return { ok: false as const, error: "אין הישגים חדשים לאיסוף" };
      }
      // One line per resource rather than one per achievement — collecting a
      // whole category at once otherwise prints dozens of fragments.
      return {
        ok: true as const,
        count: granted.length,
        totals: mergeRewards(granted),
      };
    });

    if (result.ok) revalidatePath("/game", "layout");
    return result;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה" };
  }
}
