import "server-only";
import { prisma } from "@/lib/prisma";
import { getTunables } from "@/lib/game/config";
import { lastDailyUpdate, nextDailyUpdate } from "@/lib/game/time";
import { seasonPassDay } from "@/lib/game/seasonPass";
import { armyPower } from "@/lib/game/power";
import { weaponsPower } from "@/lib/game/weapons";
import { getActiveGuildBuffPct } from "@/lib/game/guildBuffs";
import { getGuildAidBonus } from "@/lib/game/guildAid";
import { bonusMultiplier, heroBonuses } from "@/lib/game/hero";
import type { FullEmpire } from "@/lib/game/updates";
import {
  bossForCity,
  bossHeroXp,
  bossPower,
  bossReward,
  bossTurnCost,
  type BossReward,
  type CityBoss,
} from "@/lib/game/bosses";

/** One empire that has felled the city's boss, for the banner's honour roll. */
export interface BossConqueror {
  empireId: string;
  empireName: string;
  kills: number;
  lastAt: Date;
}

export interface CityBossState {
  boss: CityBoss;
  /** The boss's fixed battle power, after the admin multiplier. */
  power: number;
  turnCost: number;
  /** The viewer's real attack power, computed exactly as the fight computes it. */
  myPower: number;
  myTurns: number;
  /** Spoils a victory pays right now (tier × season day). */
  reward: BossReward;
  heroXp: number;
  /** Victories banked / allowed between one daily update and the next. */
  victoriesUsed: number;
  victoriesAllowed: number;
  /** When the allowance refills — the next daily update. */
  refreshesAt: Date;
  /** Everything that must be true before the button is live. */
  canAttack: boolean;
  /** Whether the viewer would win with their current army. */
  wouldWin: boolean;
  /** This empire's total victories over this boss, all-time. */
  myKills: number;
  conquerors: BossConqueror[];
}

/** How many conquerors the banner's honour roll lists. */
const CONQUEROR_ROWS = 5;

/**
 * Everything the boss banner renders, for an already-settled empire.
 *
 * `myPower` is built from the same terms `attackCityBoss` uses, so the
 * comparison shown on the banner is the comparison the fight will make.
 */
export async function getCityBossState(empire: FullEmpire): Promise<CityBossState> {
  const now = new Date();
  const boss = bossForCity(empire.cities);
  const tunables = await getTunables();

  const [guildBonusPct, guildAid, season, victoriesUsed, myKills, recent] =
    await Promise.all([
      getActiveGuildBuffPct(empire.id, "ATTACK", prisma, now),
      getGuildAidBonus(empire.id),
      prisma.gameSeason.findFirst({
        where: { isActive: true },
        select: { startsAt: true, endsAt: true },
      }),
      prisma.bossFight.count({
        where: {
          empireId: empire.id,
          victory: true,
          createdAt: { gte: lastDailyUpdate(now) },
        },
      }),
      prisma.bossFight.count({
        where: { empireId: empire.id, victory: true, cityTier: empire.cities },
      }),
      // Newest victories in this city tier. Grouping in SQL would lose the
      // empire names, so we take a bounded recent window and fold it in JS.
      prisma.bossFight.findMany({
        where: { victory: true, cityTier: empire.cities },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          empireId: true,
          createdAt: true,
          empire: { select: { name: true } },
        },
      }),
    ]);

  const heroBonusPct = heroBonuses(empire.hero).totalPct.attack;
  const myPower =
    (armyPower(empire.army) + weaponsPower(empire.weapons, "ATTACK")) *
      bonusMultiplier(heroBonusPct) *
      bonusMultiplier(guildBonusPct) +
    guildAid.power;

  const power = bossPower(empire.cities, tunables.boss.powerMultiplier);
  const turnCost = bossTurnCost(empire.cities);
  const victoriesAllowed = Math.floor(tunables.boss.victoriesPerCycle);

  const byEmpire = new Map<string, BossConqueror>();
  for (const row of recent) {
    const entry = byEmpire.get(row.empireId);
    if (entry) entry.kills += 1;
    else
      byEmpire.set(row.empireId, {
        empireId: row.empireId,
        empireName: row.empire.name,
        kills: 1,
        lastAt: row.createdAt,
      });
  }
  const conquerors = [...byEmpire.values()]
    .sort((a, b) => b.kills - a.kills || b.lastAt.getTime() - a.lastAt.getTime())
    .slice(0, CONQUEROR_ROWS);

  return {
    boss,
    power,
    turnCost,
    myPower,
    myTurns: empire.turns,
    reward: bossReward(
      empire.cities,
      seasonPassDay(season, now.getTime()),
      tunables.boss.rewardMultiplier
    ),
    heroXp: bossHeroXp(empire.cities),
    victoriesUsed,
    victoriesAllowed,
    refreshesAt: nextDailyUpdate(now),
    canAttack:
      victoriesAllowed > 0 &&
      victoriesUsed < victoriesAllowed &&
      empire.turns >= turnCost &&
      (empire.army?.soldiers ?? 0) > 0,
    wouldWin: myPower > power,
    myKills,
    conquerors,
  };
}
