import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BUILDING_META,
  bankInterestRate,
  citizenCapacity,
  cityProductionMultiplier,
  mineProductionPerTick,
  type StorableResource,
} from "./constants";
import { getTunables } from "./config";
import { dailyUpdatesBetween, elapsedRegularTicks, lastTickBoundary } from "./time";
import { turnsGainFromUpgrades } from "./turns";
import { bonusMultiplier, heroBonuses } from "./hero";
import { getActiveGuildBuffPct } from "./guildBuffs";
import { getActiveResourceBoosts } from "./diamondEffects";

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
    // One JOINed query instead of ~10 (one per relation). This runs on every
    // /game page load via requireEmpire, so it's the app's hottest read.
    relationLoadStrategy: "join",
  });

  // Empires created before the hero system get their hero lazily.
  if (!empire.hero) {
    empire.hero = {
      ...(await tx.hero.create({ data: { empireId } })),
      items: [],
    };
  }

  const now = new Date();
  const tunables = await getTunables();

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
    // Cities multiply raw mine output: ×1 at one city, ×10 at ten. Derived from
    // the live count, so a city lost to siege drops production on the next tick.
    const baseMultiplier =
      bonusMultiplier(heroBonus.points.resources) *
      bonusMultiplier(guildResourcesPct) *
      tunables.economy.mineProductionMultiplier *
      cityProductionMultiplier(empire.cities);
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
    const citizensPerDaily =
      tunables.daily.citizensBase + growthLevel * tunables.daily.citizensPerLevel;
    // Citizen/diamond items add a flat count per daily update (not a %).
    citizensGained =
      Math.round(citizensPerDaily * missedDailies.length) +
      heroBonus.itemsFlat.citizens * missedDailies.length;

    // Cities cap the population: the daily intake fills up to the city ceiling
    // (cities × 100) and no further. Already at or above the ceiling → no gain.
    const capacity = citizenCapacity(empire.cities);
    citizensGained = Math.max(0, Math.min(citizensGained, capacity - empire.citizens));

    // Diamonds now come only from hero items on the daily update; the retired
    // DIAMOND_YIELD upgrade no longer contributes.
    diamondsGained = heroBonus.itemsFlat.diamonds * missedDailies.length;
  }

  // Top up wheel spins once per missed daily update, capped so they can't bank
  // forever. Never lowers a balance already above the cap.
  const wheelSpins =
    missedDailies.length > 0
      ? Math.max(
          empire.wheelSpins,
          Math.min(
            tunables.daily.wheelSpinsCap,
            empire.wheelSpins + tunables.daily.wheelSpins * missedDailies.length
          )
        )
      : empire.wheelSpins;

  if (ticks === 0 && missedDailies.length === 0) return empire;

  // Claim this settlement atomically. The guard pins the clock columns to the
  // exact snapshot we read; if a concurrent settlement of the same empire has
  // already advanced the clock, this updateMany matches zero rows and we bail
  // out without re-crediting. Without this guard the derived production, turns,
  // citizens and diamonds would be credited N times when N requests settle the
  // same backlog at once — and this runs *without* an outer transaction on
  // every page load (see requireEmpire in lib/auth.ts) and across many empires
  // concurrently on the rankings page.
  const claim = await tx.empire.updateMany({
    where: {
      id: empireId,
      ...(ticks > 0 ? { lastRegularUpdateAt: empire.lastRegularUpdateAt } : {}),
      ...(missedDailies.length > 0
        ? { lastDailyUpdateAt: empire.lastDailyUpdateAt }
        : {}),
    },
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
  });

  // Lost the race: another settlement already applied this backlog. Return the
  // freshly-settled row without crediting anything again (bank interest below
  // is likewise skipped, so interest cannot compound twice per daily boundary).
  if (claim.count === 0) {
    return tx.empire.findUniqueOrThrow({
      where: { id: empireId },
      include: FULL_EMPIRE_INCLUDE,
    });
  }

  // Only the settlement that won the claim compounds bank interest and opens a
  // new deposit period.
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

    // Every daily update opens a new deposit period. Credit the accrued
    // interest as an *increment*, never an absolute set: this settle can run
    // without an outer transaction (see requireEmpire / the rankings page), so a
    // concurrent deposit/withdraw may commit between the read at the top of this
    // function and this write. An absolute `goldBalance: balance` would clobber
    // that concurrent bank action (lost update — duplicating or destroying
    // gold); the delta form composes with it. Matches castBankInterestSpell.
    const accruedInterest = balance - bankAccount.goldBalance;
    await tx.bankAccount.update({
      where: { id: bankAccount.id },
      data: {
        goldBalance: { increment: accruedInterest },
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
  return tx.empire.findUniqueOrThrow({
    where: { id: empireId },
    include: FULL_EMPIRE_INCLUDE,
    relationLoadStrategy: "join",
  });
}
