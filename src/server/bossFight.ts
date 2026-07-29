import "server-only";
import type { HeroItemSlot, HeroRarity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyPendingUpdates } from "@/lib/game/updates";
import { getTunables } from "@/lib/game/config";
import { lastDailyUpdate } from "@/lib/game/time";
import { seasonPassDay } from "@/lib/game/seasonPass";
import { awardSeasonPassXp } from "@/server/seasonPassXp";
import { armyPower } from "@/lib/game/power";
import { weaponsPower } from "@/lib/game/weapons";
import { getActiveGuildBuffPct } from "@/lib/game/guildBuffs";
import { getGuildAidBonus } from "@/lib/game/guildAid";
import {
  HERO_BAG_CAPACITY,
  RARITY_ORDER,
  applyHeroXp,
  bonusMultiplier,
  classXpMultiplier,
  heroBonuses,
  itemLevelForRarity,
  rollGuaranteedItem,
  CITIZENS_PER_LEVEL,
} from "@/lib/game/hero";
import { grantCitizens } from "@/lib/game/grants";
import { getActivePotionKinds } from "@/lib/game/potionEffects";
import { POTION_DOUBLE } from "@/lib/game/potions";
import { syncEmpirePower } from "@/server/empirePower";
import {
  BOSS_HERO_XP_DEFEAT,
  BOSS_ITEM_RARITY_FLOOR,
  bossForCity,
  bossHeroXp,
  bossPower,
  bossReward,
  bossSoldierLossRate,
  bossTurnCost,
} from "@/lib/game/bosses";

/** Either a user-facing refusal, or the report the run produced. */
export type BossFightOutcome = { error: string } | { fightId: string };

/**
 * Victories this empire has already banked in the current daily-update cycle.
 * Called inside the transaction that holds the empire's row lock, so a
 * concurrent run cannot slip past the allowance between the count and the write.
 */
async function victoriesThisCycle(
  tx: Prisma.TransactionClient,
  empireId: string,
  now: Date
): Promise<number> {
  return tx.bossFight.count({
    where: { empireId, victory: true, createdAt: { gte: lastDailyUpdate(now) } },
  });
}

/**
 * March `empireId` on the boss of its own city tier.
 *
 * Caller-authenticated: this resolves the fight for whatever empire it is
 * handed, so the server action above it owns the "is this really your empire"
 * check. Everything else — the turn cost, the per-cycle allowance, the army
 * requirement — is enforced here, inside the transaction.
 *
 * Resolution mirrors `attackEmpire` on the attacker's side exactly: soldiers
 * plus attack weapons, multiplied by the hero's attack bonus and any active
 * guild ATTACK spell, plus flat guild aid, compared against the boss's fixed
 * power. Strictly greater wins; there is no roll, so the boss power printed on
 * the banner is a promise, not an estimate.
 *
 * The turns are spent whether the run wins or loses.
 */
export async function runBossFight(empireId: string): Promise<BossFightOutcome> {
  return prisma.$transaction(async (tx) => {
    // Serialize this empire's boss runs. The per-cycle allowance is a
    // count-then-insert, and the hero level-up below reads a snapshot and
    // then applies unguarded increments — two simultaneous runs would both
    // see zero victories and both pay out. Locking the empire row up front
    // forces the second to re-read after the first commits.
    await tx.$queryRaw`SELECT id FROM "Empire" WHERE id = ${empireId} FOR UPDATE`;

    const tunables = await getTunables();
    const empire = await applyPendingUpdates(empireId, tx);
    const now = new Date();

    const boss = bossForCity(empire.cities);
    const turnCost = bossTurnCost(empire.cities);
    const power = bossPower(empire.cities, tunables.boss.powerMultiplier);

    const allowance = Math.floor(tunables.boss.victoriesPerCycle);
    if (allowance <= 0) {
      return { error: "בוס העיר אינו זמין כרגע." };
    }
    if ((await victoriesThisCycle(tx, empireId, now)) >= allowance) {
      return {
        error: `${boss.name} עדיין מלקק את פצעיו — חזור אליו אחרי העדכון היומי הבא.`,
      };
    }

    const army = empire.army;
    if (!army || army.soldiers === 0) {
      return { error: "אין לך צבא לתקיפה — אמן חיילים קודם" };
    }
    if (empire.turns < turnCost) {
      return {
        error: `נדרשות ${turnCost.toLocaleString("he-IL")} תורות כדי לצאת לקרב מול ${boss.name}.`,
      };
    }

    // Guarded debit: a concurrent action can never drive turns negative.
    const paid = await tx.empire.updateMany({
      where: { id: empireId, turns: { gte: turnCost } },
      data: { turns: { decrement: turnCost } },
    });
    if (paid.count === 0) {
      return {
        error: `נדרשות ${turnCost.toLocaleString("he-IL")} תורות כדי לצאת לקרב מול ${boss.name}.`,
      };
    }

    /* ---- resolution ---- */
    const hero = empire.hero;
    const heroBonusPct = heroBonuses(hero).totalPct.attack;
    const guildBonusPct = await getActiveGuildBuffPct(empireId, "ATTACK", tx);
    const guildAid = await getGuildAidBonus(empireId, tx);
    const attackerPower =
      (armyPower(army) + weaponsPower(empire.weapons, "ATTACK")) *
        bonusMultiplier(heroBonusPct) *
        bonusMultiplier(guildBonusPct) +
      guildAid.power;

    const victory = attackerPower > power;

    const soldiersLost = Math.min(
      army.soldiers,
      Math.round(army.soldiers * bossSoldierLossRate(victory, attackerPower, power))
    );

    // The haul tracks the season's progress, exactly like the season pass.
    const season = victory
      ? await tx.gameSeason.findFirst({
          where: { isActive: true },
          select: { startsAt: true, endsAt: true },
        })
      : null;
    const reward = victory
      ? bossReward(
          empire.cities,
          seasonPassDay(season, now.getTime()),
          tunables.boss.rewardMultiplier
        )
      : { gold: 0, wood: 0, iron: 0, stone: 0, slaves: 0 };

    await tx.army.update({
      where: { empireId },
      data: {
        soldiers: { decrement: soldiersLost },
        // Captives dragged home from the boss's pens arrive unassigned.
        ...(reward.slaves > 0 ? { mineSlaves: { increment: reward.slaves } } : {}),
      },
    });
    await syncEmpirePower(tx, empireId);

    if (victory) {
      await tx.empire.update({
        where: { id: empireId },
        data: {
          gold: { increment: reward.gold },
          wood: { increment: reward.wood },
          iron: { increment: reward.iron },
          stone: { increment: reward.stone },
        },
      });
    }

    /* ---- hero: XP, level-ups and the boss's gear ---- */
    // Marching on a tyrant is an attack too, so שיקוי הניסיון doubles what the
    // hero learns from it — win or lose, exactly like the base XP.
    const xpMultiplier = (await getActivePotionKinds(empireId, tx, now)).has(
      "DOUBLE_XP"
    )
      ? POTION_DOUBLE
      : 1;
    const heroXp = Math.round(
      (victory ? bossHeroXp(empire.cities) : BOSS_HERO_XP_DEFEAT) * xpMultiplier
    );
    let droppedItem: { slot: HeroItemSlot; level: number; rarity: HeroRarity } | null = null;

    if (hero) {
      const next = applyHeroXp(
        hero,
        Math.round(heroXp * classXpMultiplier(hero))
      );
      await tx.hero.update({
        where: { id: hero.id },
        data: {
          level: next.level,
          xp: next.xp,
          unspentPoints: { increment: next.pointsGained },
        },
      });
      // Level-up citizens go through grantCitizens so the city ceiling holds.
      const levelsGained = next.level - hero.level;
      if (levelsGained > 0) {
        await grantCitizens(tx, empireId, levelsGained * CITIZENS_PER_LEVEL);
      }

      // A felled boss always leaves gear behind, and never junk: the roll
      // keeps the normal rarity odds, but anything under the floor is re-rolled
      // *as a level* in the floor's band, so the worst boss drop is a מתקדם.
      //
      // Raising `rarity` alone would not work: everywhere else in the game the
      // tier is derived from the level (`tierForLevel`), and the stored
      // `rarity` column is only a denormalised copy. A COMMON level tagged RARE
      // would still display and perform as COMMON — a lying row, not a floor.
      //
      // The bag is counted live rather than off the `hero.items` snapshot,
      // which predates this tx's empire lock — a drop that landed in between
      // would otherwise be missed and push the bag past its capacity.
      if (victory) {
        const bagCount = await tx.heroItem.count({
          where: { heroId: hero.id, equipped: false },
        });
        if (bagCount < HERO_BAG_CAPACITY) {
          const rolled = rollGuaranteedItem(next.level);
          const belowFloor =
            RARITY_ORDER.indexOf(rolled.rarity) <
            RARITY_ORDER.indexOf(BOSS_ITEM_RARITY_FLOOR);
          droppedItem = belowFloor
            ? {
                slot: rolled.slot,
                level: itemLevelForRarity(next.level, BOSS_ITEM_RARITY_FLOOR),
                rarity: BOSS_ITEM_RARITY_FLOOR,
              }
            : rolled;
          await tx.heroItem.create({
            data: { heroId: hero.id, ...droppedItem },
          });
        }
      }
    }

    const fight = await tx.bossFight.create({
      data: {
        empireId,
        cityTier: empire.cities,
        bossKey: boss.key,
        victory,
        attackerPower,
        bossPower: power,
        soldiersLost,
        turnsSpent: turnCost,
        rewardGold: reward.gold,
        rewardWood: reward.wood,
        rewardIron: reward.iron,
        rewardStone: reward.stone,
        rewardSlaves: reward.slaves,
        heroBonusPct,
        guildBonusPct,
        heroXp,
        ...(droppedItem
          ? {
              droppedItemSlot: droppedItem.slot,
              droppedItemLevel: droppedItem.level,
              droppedItemRarity: droppedItem.rarity,
            }
          : {}),
      },
    });

    // The run happened and cost the turns either way — the pass pays for
    // marching, not only for winning.
  await awardSeasonPassXp(tx, empireId, "bossFight");
  return { fightId: fight.id };
  });
}
