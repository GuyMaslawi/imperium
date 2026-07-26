"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import { grantCitizens } from "@/lib/game/grants";
import { getEmpireMilitaryPower } from "@/lib/game/power";
import { isProductionBuilding } from "@/lib/game/constants";
import type { IconName } from "@/components/ui/Icon";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_REWARD_LABEL,
  needsRankScan,
  type AchievementDefinition,
  type AchievementRewardKind,
  type AchievementStats,
} from "@/lib/game/achievements";

const heNum = (n: number) => Math.round(n).toLocaleString("he-IL");

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban/verification gate on the action too, not just page loads.
  const empireId = await getActiveEmpireId();
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

/* ------------------------------ stats gathering ------------------------------ */

/** Everything the catalog tests against, minus the parts derived per-empire. */
const EMPIRE_SELECT = {
  cities: true,
  gold: true,
  army: { select: { soldiers: true } },
  hero: { select: { level: true } },
  guildMembership: { select: { id: true } },
  buildings: { select: { type: true, level: true } },
  upgrades: { select: { type: true, level: true } },
  weapons: { select: { weaponKey: true, quantity: true } },
} satisfies Prisma.EmpireSelect;

/**
 * Is this empire top of its city bucket?
 *
 * This mirrors /game/rankings exactly — same bucket, same power figure, same
 * tie-break — because "first in the ranking" has to mean the row the player
 * sees at the top of that page. It is also the one O(bucket) query in this
 * file, which is why `needsRankScan` gates it: once the achievement is
 * collected the answer never has to be asked again.
 */
async function computeIsRankOne(
  tx: Prisma.TransactionClient,
  empireId: string,
  cities: number
): Promise<boolean> {
  const bucket = await tx.empire.findMany({
    where: { cities },
    select: {
      id: true,
      level: true,
      army: { select: { soldiers: true } },
      weapons: { select: { weaponKey: true, quantity: true } },
    },
  });
  if (bucket.length === 0) return false;

  const top = bucket
    .map((e) => ({ ...e, power: getEmpireMilitaryPower(e.army, e.weapons) }))
    .sort((a, b) => b.power - a.power || b.level - a.level)[0];
  return top.id === empireId;
}

/**
 * Assemble the stats snapshot the catalog is evaluated against.
 *
 * Deliberately a handful of parallel reads rather than one big include: the
 * counters are `count`s served by existing indexes, and pulling the underlying
 * rows (a player can have thousands of battle reports) to length them in JS
 * would be far worse.
 */
async function gatherStats(
  tx: Prisma.TransactionClient,
  empireId: string,
  claimedKeys: ReadonlySet<string>
): Promise<AchievementStats | null> {
  const [empire, attacksLaunched, attackWins, spyMissions, itemsByRarity, bankDeposits, bossWins] =
    await Promise.all([
      tx.empire.findUnique({ where: { id: empireId }, select: EMPIRE_SELECT }),
      tx.battleReport.count({ where: { attackerEmpireId: empireId } }),
      tx.battleReport.count({
        where: { attackerEmpireId: empireId, winnerEmpireId: empireId },
      }),
      tx.spyReport.count({ where: { attackerEmpireId: empireId } }),
      tx.heroItem.groupBy({
        by: ["rarity"],
        where: { hero: { empireId } },
        _count: { _all: true },
      }),
      tx.bankTransaction.count({ where: { empireId, type: "DEPOSIT" } }),
      tx.bossFight.count({ where: { empireId, victory: true } }),
    ]);
  if (!empire) return null;

  const heroItems = itemsByRarity.reduce((sum, r) => sum + r._count._all, 0);
  const legendaryItems =
    itemsByRarity.find((r) => r.rarity === "LEGENDARY")?._count._all ?? 0;

  // Weapon keys are `${CATEGORY}_T${tier}` (see lib/game/weapons.ts), so the
  // prefix is the category — no need to resolve each key through the catalog.
  const ownedKeys = empire.weapons.filter((w) => w.quantity > 0).map((w) => w.weaponKey);
  const hasCategory = (category: string) =>
    ownedKeys.some((k) => k.startsWith(`${category}_`));

  const citizenGrowthLevel =
    empire.upgrades.find((u) => u.type === "CITIZEN_GROWTH")?.level ?? 1;
  // Mines are created at level 0 and only count as "built" once upgraded.
  const minesBuilt = empire.buildings.filter(
    (b) => isProductionBuilding(b.type) && b.level >= 1
  ).length;

  // The scan is skipped — and the flag left false — once the reward is banked.
  const isRankOne = needsRankScan(claimedKeys)
    ? await computeIsRankOne(tx, empireId, empire.cities)
    : false;

  return {
    attacksLaunched,
    attackWins,
    spyMissions,
    heroItems,
    legendaryItems,
    hasAttackWeapon: hasCategory("ATTACK"),
    hasDefenseWeapon: hasCategory("DEFENSE"),
    hasSpyWeapon: hasCategory("SPY"),
    citizenGrowthLevel,
    minesBuilt,
    cities: empire.cities,
    gold: empire.gold,
    soldiers: empire.army?.soldiers ?? 0,
    bankDeposits,
    bossWins,
    inGuild: empire.guildMembership !== null,
    heroLevel: empire.hero?.level ?? 1,
    isRankOne,
  };
}

/* ------------------------------ read model ------------------------------ */

export interface AchievementView {
  key: string;
  name: string;
  hint: string;
  icon: IconName;
  /** e.g. "40 אזרחים" — pre-formatted so the client stays presentational. */
  rewardLabel: string;
  rewardKind: AchievementRewardKind;
  rewardAmount: number;
  goal: number;
  /** Clamped to `goal`, so a 5,000,000-gold player still reads 1,000,000. */
  progress: number;
  unlocked: boolean;
  claimed: boolean;
}

export interface AchievementsState {
  items: AchievementView[];
  /** Unlocked and not yet collected — drives the collect button and badges. */
  collectable: number;
  claimed: number;
  total: number;
}

function rewardLabel(a: AchievementDefinition): string {
  return `${heNum(a.reward.amount)} ${ACHIEVEMENT_REWARD_LABEL[a.reward.kind]}`;
}

function buildState(
  stats: AchievementStats,
  claimedKeys: ReadonlySet<string>
): AchievementsState {
  const items = ACHIEVEMENTS.map((a) => {
    const claimed = claimedKeys.has(a.key);
    const raw = a.progress(stats);
    // A claimed achievement always shows full: the condition may since have
    // lapsed (gold spent, soldiers lost, rank taken) but the reward is banked,
    // and showing it slide back to 3/10 would read as a bug.
    const progress = claimed ? a.goal : Math.max(0, Math.min(a.goal, raw));
    return {
      key: a.key,
      name: a.name,
      hint: a.hint,
      icon: a.icon,
      rewardLabel: rewardLabel(a),
      rewardKind: a.reward.kind,
      rewardAmount: a.reward.amount,
      goal: a.goal,
      progress,
      unlocked: claimed || raw >= a.goal,
      claimed,
    };
  });

  return {
    items,
    collectable: items.filter((i) => i.unlocked && !i.claimed).length,
    claimed: items.filter((i) => i.claimed).length,
    total: items.length,
  };
}

/** Full ladder for the signed-in empire. Returns null when not signed in. */
export async function getAchievementsState(): Promise<AchievementsState | null> {
  const empireId = await getActiveEmpireId();
  if (empireId === null) return null;

  const claimed = await prisma.empireAchievement.findMany({
    where: { empireId },
    select: { key: true },
  });
  const claimedKeys = new Set(claimed.map((c) => c.key));

  const stats = await gatherStats(prisma, empireId, claimedKeys);
  if (!stats) return null;
  return buildState(stats, claimedKeys);
}

/* ------------------------------ claiming ------------------------------ */

export interface ClaimAchievementsResult {
  ok: boolean;
  error?: string;
  message?: string;
  state?: AchievementsState;
}

/** Credit one achievement's reward. Returns the text for the claim summary. */
async function grantReward(
  tx: Prisma.TransactionClient,
  empireId: string,
  a: AchievementDefinition
): Promise<string> {
  const { kind, amount } = a.reward;
  if (kind === "citizens") {
    // Citizens are ceilinged by city count; a raw increment would breach the
    // cap the daily update enforces, and citizens feed mine slaves. See grantCitizens.
    await grantCitizens(tx, empireId, amount);
  } else {
    await tx.empire.update({
      where: { id: empireId },
      data: { [kind]: { increment: amount } },
    });
  }
  return rewardLabel(a);
}

/**
 * Collect every unlocked, uncollected achievement.
 *
 * Conditions are re-evaluated here from the database rather than trusted from
 * the caller, so a client cannot claim a reward it has not earned.
 *
 * The receipt row is inserted *before* the payout, and a unique-constraint
 * violation on `(empireId, key)` is what makes a double-submit a no-op: two
 * concurrent claims race on the insert, the loser sees P2002 and skips the
 * credit entirely. Every reward is a plain resource increment that cannot fail
 * to land, so there is no case where a receipt exists but nothing was paid.
 */
export async function claimAchievements(): Promise<ClaimAchievementsResult> {
  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      await applyPendingUpdates(empireId, tx);

      const claimed = await tx.empireAchievement.findMany({
        where: { empireId },
        select: { key: true },
      });
      const claimedKeys = new Set(claimed.map((c) => c.key));

      const stats = await gatherStats(tx, empireId, claimedKeys);
      if (!stats) return { ok: false as const, error: "האימפריה לא נמצאה" };

      const granted: string[] = [];
      for (const a of ACHIEVEMENTS) {
        if (claimedKeys.has(a.key)) continue;
        if (a.progress(stats) < a.goal) continue;

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
        claimedKeys.add(a.key);
        granted.push(await grantReward(tx, empireId, a));
      }

      if (granted.length === 0) {
        return { ok: false as const, error: "אין הישגים חדשים לאיסוף" };
      }

      // Rebuilt from the stats we already have rather than re-gathering: the
      // freshly claimed rows now render as complete regardless of their
      // counters, and re-running the gather here would repeat the rank scan
      // inside the transaction for no visible gain. `revalidatePath` below
      // re-renders the page against the post-payout database anyway.
      return {
        ok: true as const,
        message: `נאספו: ${granted.join(" · ")}`,
        state: buildState(stats, claimedKeys),
      };
    });

    if (result.ok) revalidatePath("/game", "layout");
    return result;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה" };
  }
}
