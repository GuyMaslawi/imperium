"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, SeasonPassProgress } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import { grantCitizens } from "@/lib/game/grants";
import { lastDailyUpdate, nextDailyUpdate } from "@/lib/game/time";
import {
  SEASON_PASS_PREMIUM_PRICE,
  SEASON_PASS_REWARD_LABEL,
  SEASON_PASS_TIERS,
  SEASON_PASS_XP_MAX,
  seasonPassDay,
  seasonPassRewardAmount,
  tierForXp,
  type SeasonPassReward,
  type SeasonPassRewardKind,
} from "@/lib/game/seasonPass";

const heNum = (n: number) => Math.round(n).toLocaleString("he-IL");

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

/* ------------------------------ cycle handling ------------------------------ */

/**
 * Fetch the caller's progress row, rolled forward to the current cycle.
 *
 * Two independent resets can apply:
 *  - **Cycle rollover** (every daily update): XP and both claimed lists clear,
 *    and the payouts grow because the season day advanced. Premium survives.
 *  - **Season rollover**: premium clears too, because the pass is sold per
 *    season.
 *
 * The reset is a guarded `updateMany` on `cycleStartedAt` rather than a
 * read-then-write, so two concurrent requests crossing the same boundary
 * cannot both reset and double-clear a claim that landed in between.
 */
async function loadCycle(
  tx: Prisma.TransactionClient,
  empireId: string,
  activeSeasonId: string | null,
  now: Date
): Promise<SeasonPassProgress> {
  const cycleStart = lastDailyUpdate(now);

  const existing = await tx.seasonPassProgress.findUnique({ where: { empireId } });
  if (!existing) {
    return tx.seasonPassProgress.create({
      data: {
        empireId,
        seasonId: activeSeasonId,
        cycleStartedAt: cycleStart,
        xp: 0,
        claimedFree: [],
        claimedPremium: [],
      },
    });
  }

  // A season rollover is only a rollover when BOTH ids are known and differ.
  //
  // Treating any mismatch as a rollover confiscated things the player had paid
  // for. `awardSeasonPassXp` creates its row with seasonId null, so a player's
  // very first tracked action was wiped by the next render; and premium bought
  // while no season happened to be active (seasonId null) was cleared — 10
  // diamonds gone — the moment an admin activated one.
  const bothKnown = existing.seasonId !== null && activeSeasonId !== null;
  const seasonChanged = bothKnown && existing.seasonId !== activeSeasonId;
  // Row predates the active season (or was created without one): adopt it with
  // a plain write, keeping XP, claims and premium intact.
  const adoptSeason = existing.seasonId === null && activeSeasonId !== null;
  const cycleChanged = existing.cycleStartedAt.getTime() < cycleStart.getTime();
  if (!seasonChanged && !cycleChanged && !adoptSeason) return existing;

  // Guarded on the snapshot this decision was made from, so a stale caller
  // cannot apply a reset that a concurrent one already applied.
  //
  // `getSeasonPassState` calls this on the bare prisma client with no outer
  // transaction, so a page render that read a pre-boundary row could commit its
  // reset arbitrarily later — after the player had already rolled into the new
  // cycle, earned XP and claimed tiers — wiping `xp` and both claim lists
  // together. Losing the race is correct here: the other writer already did it.
  await tx.seasonPassProgress.updateMany({
    where: {
      empireId,
      cycleStartedAt: existing.cycleStartedAt,
      seasonId: existing.seasonId,
    },
    data: {
      ...(seasonChanged || cycleChanged
        ? { cycleStartedAt: cycleStart, xp: 0, claimedFree: [], claimedPremium: [] }
        : {}),
      ...(seasonChanged
        ? { seasonId: activeSeasonId, premium: false, premiumAt: null }
        : {}),
      ...(adoptSeason ? { seasonId: activeSeasonId } : {}),
    },
  });
  // Re-read either way: on a win to pick up what we just wrote, on a loss to
  // pick up what the winner wrote.
  return tx.seasonPassProgress.findUniqueOrThrow({ where: { empireId } });
}

/* ------------------------------ read model ------------------------------ */

export interface SeasonPassTierView {
  tier: number;
  reached: boolean;
  free: { kind: SeasonPassRewardKind; label: string; claimed: boolean };
  premium: { kind: SeasonPassRewardKind; label: string; claimed: boolean };
}

export interface SeasonPassState {
  xp: number;
  xpMax: number;
  level: number;
  premium: boolean;
  price: number;
  diamonds: number;
  /**
   * Whether a season is currently active. False means the premium track cannot
   * be sold at all (see buySeasonPassPremium), so the UI must say so up front
   * instead of letting the player click a button that can only fail.
   */
  seasonActive: boolean;
  /** 1-based day of the season the payouts are priced at. */
  day: number;
  /** When the ladder resets and the next, larger one opens. */
  cycleEndsAt: number;
  collectable: number;
  tiers: SeasonPassTierView[];
}

/** Human label for a reward at a given season day, e.g. "12,500 זהב". */
function rewardLabel(reward: SeasonPassReward, day: number): string {
  const amount = seasonPassRewardAmount(reward, day);
  return `${heNum(amount)} ${SEASON_PASS_REWARD_LABEL[reward.kind]}`;
}

function buildState(
  progress: SeasonPassProgress,
  diamonds: number,
  day: number,
  now: Date,
  seasonActive: boolean
): SeasonPassState {
  const level = tierForXp(progress.xp);
  const claimedFree = new Set(progress.claimedFree);
  const claimedPremium = new Set(progress.claimedPremium);

  const tiers = SEASON_PASS_TIERS.map((t) => ({
    tier: t.tier,
    reached: t.tier <= level,
    free: {
      kind: t.free.kind,
      label: rewardLabel(t.free, day),
      claimed: claimedFree.has(t.tier),
    },
    premium: {
      kind: t.premium.kind,
      label: rewardLabel(t.premium, day),
      claimed: claimedPremium.has(t.tier),
    },
  }));

  const collectable = tiers.filter(
    (t) =>
      t.reached && (!t.free.claimed || (progress.premium && !t.premium.claimed))
  ).length;

  return {
    xp: progress.xp,
    xpMax: SEASON_PASS_XP_MAX,
    level,
    premium: progress.premium,
    price: SEASON_PASS_PREMIUM_PRICE,
    diamonds,
    seasonActive,
    day,
    cycleEndsAt: nextDailyUpdate(now).getTime(),
    collectable,
    tiers,
  };
}

/** Current ladder for the signed-in empire. Returns null when not signed in. */
export async function getSeasonPassState(): Promise<SeasonPassState | null> {
  const empireId = await getActiveEmpireId();
  if (empireId === null) return null;

  const now = new Date();
  const [season, empire] = await Promise.all([
    prisma.gameSeason.findFirst({
      where: { isActive: true },
      select: { id: true, startsAt: true, endsAt: true },
    }),
    prisma.empire.findUnique({
      where: { id: empireId },
      select: { diamonds: true },
    }),
  ]);
  if (!empire) return null;

  const progress = await loadCycle(prisma, empireId, season?.id ?? null, now);
  const day = seasonPassDay(season, now.getTime());
  return buildState(progress, empire.diamonds, day, now, season !== null);
}

/* ------------------------------ premium purchase ------------------------------ */

export interface SeasonPassResult {
  ok: boolean;
  error?: string;
  message?: string;
  state?: SeasonPassState;
}

/**
 * Buy the premium track for the rest of the season.
 *
 * The diamond debit is a guarded `updateMany(diamonds >= price)` — never a
 * plain decrement — so two concurrent clicks cannot both pass an affordability
 * check and drive the balance negative. The `premium: false` guard on the flag
 * write makes the second click a no-op instead of a second charge.
 */
export async function buySeasonPassPremium(): Promise<SeasonPassResult> {
  try {
    const empireId = await requireOwnEmpireId();
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      await applyPendingUpdates(empireId, tx);

      const season = await tx.gameSeason.findFirst({
        where: { isActive: true },
        select: { id: true, startsAt: true, endsAt: true },
      });
      // The pass is sold *per season*, so selling one when no season is active
      // charges the full pass price for a row that the next activation legitimately
      // clears as a season rollover — a silent confiscation with no refund and
      // no ledger entry. Refuse the sale instead.
      if (!season) {
        return {
          ok: false as const,
          error: "אין עונה פעילה כרגע — לא ניתן לרכוש את מסלול הפרימיום",
        };
      }

      const progress = await loadCycle(tx, empireId, season.id, now);
      if (progress.premium) {
        return { ok: false as const, error: "כבר רכשת את מסלול הפרימיום לעונה הזו" };
      }

      // Claim the flag first: if this loses the race it returns 0 and we bail
      // before touching diamonds, so a double-click never double-charges.
      const claimedFlag = await tx.seasonPassProgress.updateMany({
        where: { empireId, premium: false },
        data: { premium: true, premiumAt: now, seasonId: season.id },
      });
      if (claimedFlag.count === 0) {
        return { ok: false as const, error: "כבר רכשת את מסלול הפרימיום לעונה הזו" };
      }

      const paid = await tx.empire.updateMany({
        where: { id: empireId, diamonds: { gte: SEASON_PASS_PREMIUM_PRICE } },
        data: { diamonds: { decrement: SEASON_PASS_PREMIUM_PRICE } },
      });
      if (paid.count === 0) {
        // Roll the flag back inside the same transaction.
        throw new InsufficientDiamonds();
      }

      const empire = await tx.empire.findUniqueOrThrow({
        where: { id: empireId },
        select: { diamonds: true },
      });
      const fresh = await tx.seasonPassProgress.findUniqueOrThrow({
        where: { empireId },
      });
      const day = seasonPassDay(season, now.getTime());
      return {
        ok: true as const,
        message: "מסלול הפרימיום נפתח לכל העונה! 👑",
        state: buildState(fresh, empire.diamonds, day, now, true),
      };
    });

    if (result.ok) revalidatePath("/game", "layout");
    return result;
  } catch (err) {
    if (err instanceof InsufficientDiamonds) {
      return { ok: false, error: `אין מספיק יהלומים (דרושים ${SEASON_PASS_PREMIUM_PRICE})` };
    }
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה" };
  }
}

/** Thrown to roll back the premium flag when the diamond debit fails. */
class InsufficientDiamonds extends Error {}

/* ------------------------------ claiming ------------------------------ */

/** Credit one reward to the empire. Returns the text for the claim summary. */
async function grantReward(
  tx: Prisma.TransactionClient,
  empireId: string,
  reward: SeasonPassReward,
  day: number
): Promise<string> {
  const amount = seasonPassRewardAmount(reward, day);
  const field = reward.kind; // gold | wood | iron | stone | turns | citizens
  if (field === "citizens") {
    // Citizens are capped by city count; a raw increment here would breach the
    // ceiling the daily update enforces. See grantCitizens.
    await grantCitizens(tx, empireId, amount);
  } else {
    await tx.empire.update({
      where: { id: empireId },
      data: { [field]: { increment: amount } },
    });
  }
  return `${heNum(amount)} ${SEASON_PASS_REWARD_LABEL[reward.kind]}`;
}

/**
 * Collect every unlocked, unclaimed reward on both tracks.
 *
 * Each tier is marked with a guarded `updateMany` whose `NOT: { has: tier }`
 * predicate fails if a concurrent request already pushed that tier — so a
 * double-submit grants each reward exactly once. Only tiers that actually
 * flipped from unclaimed to claimed are then paid out.
 */
export async function claimSeasonPassRewards(): Promise<SeasonPassResult> {
  try {
    const empireId = await requireOwnEmpireId();
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      await applyPendingUpdates(empireId, tx);

      const season = await tx.gameSeason.findFirst({
        where: { isActive: true },
        select: { id: true, startsAt: true, endsAt: true },
      });
      const progress = await loadCycle(tx, empireId, season?.id ?? null, now);
      const day = seasonPassDay(season, now.getTime());
      const level = tierForXp(progress.xp);
      if (level === 0) {
        return { ok: false as const, error: "עדיין לא הגעת לאף דרגה במחזור הזה" };
      }

      const granted: string[] = [];
      for (const t of SEASON_PASS_TIERS) {
        if (t.tier > level) break;

        // Every reward kind on the ladder is a plain resource/turn/citizen
        // credit that cannot fail to land, so taking the claim flag first is
        // safe — there is no case left where a tier is marked collected and
        // then delivers nothing.
        const tookFree = await tx.seasonPassProgress.updateMany({
          where: { empireId, NOT: { claimedFree: { has: t.tier } } },
          data: { claimedFree: { push: t.tier } },
        });
        if (tookFree.count > 0) {
          const text = await grantReward(tx, empireId, t.free, day);
          if (text) granted.push(text);
        }

        if (!progress.premium) continue;
        const tookPremium = await tx.seasonPassProgress.updateMany({
          where: { empireId, NOT: { claimedPremium: { has: t.tier } } },
          data: { claimedPremium: { push: t.tier } },
        });
        if (tookPremium.count > 0) {
          const text = await grantReward(tx, empireId, t.premium, day);
          if (text) granted.push(text);
        }
      }

      if (granted.length === 0) {
        return {
          ok: false as const,
          error: "אין תגמולים חדשים לאיסוף",
        };
      }

      const [empire, fresh] = await Promise.all([
        tx.empire.findUniqueOrThrow({
          where: { id: empireId },
          select: { diamonds: true },
        }),
        tx.seasonPassProgress.findUniqueOrThrow({ where: { empireId } }),
      ]);
      return {
        ok: true as const,
        message: `נאספו: ${granted.join(" · ")}`,
        state: buildState(fresh, empire.diamonds, day, now, season !== null),
      };
    });

    if (result.ok) revalidatePath("/game", "layout");
    return result;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה" };
  }
}
