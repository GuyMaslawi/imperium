import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BUILDING_META,
  bankInterestRate,
  citizensPerDailyUpdate,
  mineProductionPerTick,
  REGULAR_TICK_MS,
  type StorableResource,
} from "./constants";
import { dailyUpdatesBetween, elapsedRegularTicks } from "./time";
import { turnsGainFromUpgrades } from "./turns";

const FULL_EMPIRE_INCLUDE = {
  buildings: true,
  army: true,
  storages: true,
  upgrades: true,
  bankAccount: true,
  weapons: true,
  weaponUnlocks: true,
} satisfies Prisma.EmpireInclude;

export type FullEmpire = Prisma.EmpireGetPayload<{
  include: typeof FULL_EMPIRE_INCLUDE;
}>;

/**
 * Lazy game clock: apply every missed 5-minute production tick and every
 * missed daily update (07:30 / 19:30 Asia/Jerusalem) for this empire.
 * Called whenever the empire is loaded or acts.
 */
export async function applyPendingUpdates(
  empireId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<FullEmpire> {
  const empire = await tx.empire.findUniqueOrThrow({
    where: { id: empireId },
    include: FULL_EMPIRE_INCLUDE,
  });

  const now = new Date();

  /* ---- regular ticks: mine-slave production + turns ---- */
  const ticks = elapsedRegularTicks(empire.lastRegularUpdateAt, now);
  const gained: Record<StorableResource, number> = { gold: 0, wood: 0, iron: 0, stone: 0 };
  let turnsGained = 0;
  if (ticks > 0) {
    for (const building of empire.buildings) {
      const meta = BUILDING_META[building.type];
      if (!meta.producedResource) continue;
      gained[meta.producedResource] +=
        mineProductionPerTick(building.level, building.slavesAssigned) * ticks;
    }
    // Full ticks only — no partial-tick turns, no cap for now.
    turnsGained = ticks * turnsGainFromUpgrades(empire.upgrades);
  }

  /* ---- daily updates: citizens + bank interest + deposit-period reset ---- */
  const missedDailies = dailyUpdatesBetween(empire.lastDailyUpdateAt, now);
  let citizensGained = 0;
  if (missedDailies.length > 0) {
    const growthLevel =
      empire.upgrades.find((u) => u.type === "CITIZEN_GROWTH")?.level ?? 1;
    citizensGained = citizensPerDailyUpdate(growthLevel) * missedDailies.length;
  }

  if (ticks === 0 && missedDailies.length === 0) return empire;

  const bankAccount = empire.bankAccount;
  if (bankAccount && missedDailies.length > 0) {
    // Interest compounds once per missed daily update, floored to whole gold.
    const interestLevel =
      empire.upgrades.find((u) => u.type === "BANK_DAILY_INTEREST")?.level ?? 1;
    const rate = bankInterestRate(interestLevel);
    let balance = bankAccount.goldBalance;
    const interestEntries: { amount: number; balanceAfter: number; createdAt: Date }[] = [];
    for (const dailyAt of missedDailies) {
      const interest = Math.floor(balance * rate);
      if (interest <= 0) continue;
      balance += interest;
      interestEntries.push({ amount: interest, balanceAfter: balance, createdAt: dailyAt });
    }

    // Every daily update opens a new deposit period.
    await tx.bankAccount.update({
      where: { id: bankAccount.id },
      data: {
        goldBalance: balance,
        depositsUsedInCurrentPeriod: 0,
        depositPeriodStartedAt: missedDailies[missedDailies.length - 1],
      },
    });
    if (interestEntries.length > 0) {
      await tx.bankTransaction.createMany({
        data: interestEntries.map((entry) => ({
          bankAccountId: bankAccount.id,
          empireId: empire.id,
          type: "INTEREST" as const,
          ...entry,
        })),
      });
    }
  }

  // Warehouse capacity limits only the protected stored pool — production
  // accumulates freely into the available balance.
  return tx.empire.update({
    where: { id: empireId },
    data: {
      gold: { increment: gained.gold },
      wood: { increment: gained.wood },
      iron: { increment: gained.iron },
      stone: { increment: gained.stone },
      citizens: { increment: citizensGained },
      turns: { increment: turnsGained },
      lastRegularUpdateAt: new Date(
        empire.lastRegularUpdateAt.getTime() + ticks * REGULAR_TICK_MS
      ),
      ...(missedDailies.length > 0
        ? { lastDailyUpdateAt: missedDailies[missedDailies.length - 1] }
        : {}),
    },
    include: FULL_EMPIRE_INCLUDE,
  });
}
