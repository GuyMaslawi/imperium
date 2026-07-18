import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BUILDING_META,
  bankInterestRate,
  citizensPerDailyUpdate,
  diamondsPerDailyUpdate,
  mineProductionPerTick,
  type StorableResource,
} from "./constants";
import { dailyUpdatesBetween, elapsedRegularTicks, lastTickBoundary } from "./time";
import { turnsGainFromUpgrades } from "./turns";
import { bonusMultiplier, heroBonuses } from "./hero";
import { getActiveGuildBuffPct } from "./guildBuffs";
import { getActiveResourceBoosts } from "./diamondEffects";
import { WHEEL_DAILY_SPINS, WHEEL_SPINS_CAP } from "./wheel";

const FULL_EMPIRE_INCLUDE = {
  buildings: true,
  army: true,
  storages: true,
  upgrades: true,
  bankAccount: true,
  weapons: true,
  weaponUnlocks: true,
  hero: { include: { items: true } },
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

  // Empires created before the hero system get their hero lazily.
  if (!empire.hero) {
    empire.hero = {
      ...(await tx.hero.create({ data: { empireId } })),
      items: [],
    };
  }

  const now = new Date();

  // Hero bonuses: the resources *points* still multiply mine production, while
  // equipped items now add flat amounts — extra resources per tick, and extra
  // turns/citizens/diamonds per update (whole units, not percentages).
  const heroBonus = heroBonuses(empire.hero);

  /* ---- regular ticks: mine-slave production + turns ---- */
  const ticks = elapsedRegularTicks(empire.lastRegularUpdateAt, now);
  const gained: Record<StorableResource, number> = { gold: 0, wood: 0, iron: 0, stone: 0 };
  let turnsGained = 0;
  if (ticks > 0) {
    // An active guild resources spell multiplies mine production on top of
    // the hero bonus for the ticks being settled now; diamond boosts add a
    // further per-resource multiplier on top of both.
    const guildResourcesPct = await getActiveGuildBuffPct(empire.id, "RESOURCES", tx, now);
    const resourceBoosts = await getActiveResourceBoosts(empire.id, tx, now);
    const baseMultiplier =
      bonusMultiplier(heroBonus.points.resources) * bonusMultiplier(guildResourcesPct);
    for (const building of empire.buildings) {
      const meta = BUILDING_META[building.type];
      if (!meta.producedResource) continue;
      const multiplier =
        baseMultiplier * bonusMultiplier(resourceBoosts[meta.producedResource]);
      gained[meta.producedResource] +=
        mineProductionPerTick(building.level, building.slavesAssigned) * ticks * multiplier;
    }
    // Equipped resource items conjure a flat amount each tick — but only for
    // the specific resources their tier covers (some feed one resource, some
    // several, an אגדי relic all four).
    for (const res of Object.keys(gained) as StorableResource[]) {
      gained[res] += heroBonus.itemsFlatByResource[res] * ticks;
    }
    // Full ticks only — no partial-tick turns, no cap for now. Turn items add a
    // flat number of turns per tick (not a percentage).
    turnsGained =
      Math.round(ticks * turnsGainFromUpgrades(empire.upgrades)) +
      heroBonus.itemsFlat.turns * ticks;
  }

  /* ---- daily updates: citizens + diamonds + bank interest + deposit-period reset ---- */
  const missedDailies = dailyUpdatesBetween(empire.lastDailyUpdateAt, now);
  let citizensGained = 0;
  let diamondsGained = 0;
  if (missedDailies.length > 0) {
    const growthLevel =
      empire.upgrades.find((u) => u.type === "CITIZEN_GROWTH")?.level ?? 1;
    // Citizen/diamond items add a flat count per daily update (not a %).
    citizensGained =
      Math.round(citizensPerDailyUpdate(growthLevel) * missedDailies.length) +
      heroBonus.itemsFlat.citizens * missedDailies.length;

    const diamondLevel =
      empire.upgrades.find((u) => u.type === "DIAMOND_YIELD")?.level ?? 1;
    diamondsGained =
      Math.round(diamondsPerDailyUpdate(diamondLevel) * missedDailies.length) +
      heroBonus.itemsFlat.diamonds * missedDailies.length;
  }

  // Top up wheel spins once per missed daily update, capped so they can't bank
  // forever. Never lowers a balance already above the cap.
  const wheelSpins =
    missedDailies.length > 0
      ? Math.max(
          empire.wheelSpins,
          Math.min(
            WHEEL_SPINS_CAP,
            empire.wheelSpins + WHEEL_DAILY_SPINS * missedDailies.length
          )
        )
      : empire.wheelSpins;

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
      diamonds: { increment: diamondsGained },
      citizens: { increment: citizensGained },
      turns: { increment: turnsGained },
      ...(missedDailies.length > 0 ? { wheelSpins } : {}),
      // Snap to the global boundary that was just settled, so every empire
      // ticks together on round wall-clock times (XX:00, XX:05, …).
      ...(ticks > 0 ? { lastRegularUpdateAt: lastTickBoundary(now) } : {}),
      ...(missedDailies.length > 0
        ? { lastDailyUpdateAt: missedDailies[missedDailies.length - 1] }
        : {}),
    },
    include: FULL_EMPIRE_INCLUDE,
  });
}
