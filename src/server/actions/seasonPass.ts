"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, SeasonPassProgress } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import { grantCitizens } from "@/lib/game/grants";
import { lastDailyUpdate, nextDailyUpdate } from "@/lib/game/time";
import {
  SEASON_PASS_HAUL_ORDER as HAUL_ORDER,
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

/**
 * One rung of the ladder as the client sees it.
 *
 * `amount` is carried alongside the ready-made `label` on purpose: the modal
 * has to *add rewards up* — what a claim is about to pay, what the whole cycle
 * is worth, what the gold track would add on top — and totalling parsed-back
 * Hebrew strings ("1,470 זהב") is not something a UI should be doing.
 */
export interface SeasonPassTierView {
  tier: number;
  reached: boolean;
  free: SeasonPassRewardView;
  premium: SeasonPassRewardView;
}

export interface SeasonPassRewardView {
  kind: SeasonPassRewardKind;
  /** Quantity at the current season day — already grown and rounded. */
  amount: number;
  /** The same quantity rendered for display, e.g. "1,470 זהב". */
  label: string;
  claimed: boolean;
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
  /**
   * The cycle is done: every tier reached *and* everything reachable collected.
   * For a free player that means the whole free track — the locked gold tiles
   * are not "uncollected", they were never on offer.
   */
  cleared: boolean;
  tiers: SeasonPassTierView[];
}

/** A reward priced at `day`, as both a number and a display string. */
function rewardView(
  reward: SeasonPassReward,
  day: number,
  claimed: boolean
): SeasonPassRewardView {
  const amount = seasonPassRewardAmount(reward, day);
  return {
    kind: reward.kind,
    amount,
    label: `${heNum(amount)} ${SEASON_PASS_REWARD_LABEL[reward.kind]}`,
    claimed,
  };
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
    free: rewardView(t.free, day, claimedFree.has(t.tier)),
    premium: rewardView(t.premium, day, claimedPremium.has(t.tier)),
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
    cleared: level >= SEASON_PASS_TIERS.length && collectable === 0,
    tiers,
  };
}

/**
 * Everything the empire has banked from this cycle's ladder so far, totalled per
 * kind. Priced at the current day, same as the tiles — so a clear-the-ladder
 * celebration can show the run's whole take, not just the final claim's slice.
 */
function claimedHaul(
  progress: SeasonPassProgress,
  day: number
): SeasonPassHaulEntry[] {
  const claimedFree = new Set(progress.claimedFree);
  const claimedPremium = new Set(progress.claimedPremium);
  const totals = new Map<SeasonPassRewardKind, number>();
  const add = (reward: SeasonPassReward) =>
    totals.set(
      reward.kind,
      (totals.get(reward.kind) ?? 0) + seasonPassRewardAmount(reward, day)
    );

  for (const t of SEASON_PASS_TIERS) {
    if (claimedFree.has(t.tier)) add(t.free);
    if (claimedPremium.has(t.tier)) add(t.premium);
  }
  return HAUL_ORDER.filter((kind) => totals.has(kind)).map((kind) => ({
    kind,
    amount: totals.get(kind)!,
  }));
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

/** One line of a claim summary: a resource kind and the total collected of it. */
export interface SeasonPassHaulEntry {
  kind: SeasonPassRewardKind;
  amount: number;
}

export interface SeasonPassResult {
  ok: boolean;
  error?: string;
  message?: string;
  /**
   * What a claim actually paid, **totalled per kind**. The ladder awards the
   * same kind on several tiers (gold on 1 and 7, wood on 2 and 8) on both
   * tracks, so a per-tier list reads as a wall of near-duplicates
   * ("4,000 זהב · 12,000 זהב · … · 5,000 זהב · 15,000 זהב"). One entry per kind
   * is both shorter and the number the player actually cares about.
   */
  haul?: SeasonPassHaulEntry[];
  /** How many ladder tiers the claim collected, across both tracks. */
  haulTiers?: number;
  /**
   * Set only on the claim that *finishes* the cycle: the empire's whole take
   * from this ladder, totalled per kind. The per-claim `haul` above is just the
   * last slice, which undersells a full clear.
   */
  cycleHaul?: SeasonPassHaulEntry[];
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

/** Credit one reward to the empire. Returns the quantity actually granted. */
async function grantReward(
  tx: Prisma.TransactionClient,
  empireId: string,
  reward: SeasonPassReward,
  day: number
): Promise<number> {
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
  return amount;
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

      // Totalled per kind rather than appended per tier — see SeasonPassResult.
      const granted = new Map<SeasonPassRewardKind, number>();
      // Distinct ladder rungs collected — a tier paying on both tracks is one
      // tier, not two, since that is the count the modal reports as "דרגות".
      const tiersTaken = new Set<number>();
      const credit = (kind: SeasonPassRewardKind, amount: number, tier: number) => {
        granted.set(kind, (granted.get(kind) ?? 0) + amount);
        tiersTaken.add(tier);
      };

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
          credit(t.free.kind, await grantReward(tx, empireId, t.free, day), t.tier);
        }

        if (!progress.premium) continue;
        const tookPremium = await tx.seasonPassProgress.updateMany({
          where: { empireId, NOT: { claimedPremium: { has: t.tier } } },
          data: { claimedPremium: { push: t.tier } },
        });
        if (tookPremium.count > 0) {
          credit(t.premium.kind, await grantReward(tx, empireId, t.premium, day), t.tier);
        }
      }

      if (granted.size === 0) {
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
      const haul = HAUL_ORDER.filter((kind) => granted.has(kind)).map((kind) => ({
        kind,
        amount: granted.get(kind)!,
      }));
      const state = buildState(fresh, empire.diamonds, day, now, season !== null);
      return {
        ok: true as const,
        // Kept as a plain-text fallback for anything that only reads `message`;
        // the modal renders `haul` instead.
        message: `נאספו: ${haul
          .map((h) => `${heNum(h.amount)} ${SEASON_PASS_REWARD_LABEL[h.kind]}`)
          .join(" · ")}`,
        haul,
        haulTiers: tiersTaken.size,
        cycleHaul: state.cleared ? claimedHaul(fresh, day) : undefined,
        state,
      };
    });

    if (result.ok) revalidatePath("/game", "layout");
    return result;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה" };
  }
}
