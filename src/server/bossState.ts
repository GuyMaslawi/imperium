import "server-only";
import { prisma } from "@/lib/prisma";
import { getTunables } from "@/lib/game/config";
import { seasonPassDay } from "@/lib/game/seasonPass";
import { armyPower } from "@/lib/game/power";
import { weaponsPower } from "@/lib/game/weapons";
import { getActiveGuildBuffPct } from "@/lib/game/guildBuffs";
import { getGuildAidBonus } from "@/lib/game/guildAid";
import { bonusMultiplier, heroBonuses, isHeroDead } from "@/lib/game/hero";
import type { FullEmpire } from "@/lib/game/updates";
import {
  BOSS_REVIVE_MS,
  bossForCity,
  bossHeroXp,
  bossPower,
  bossReward,
  bossTurnCost,
  type BossReward,
  type CityBoss,
} from "@/lib/game/bosses";
import {
  BOSS_SORTIE_ROUNDS,
  bossExpectedSortieDamage,
  bossReadChance,
  bossSiegeMaxHp,
  bossSortiesToKill,
} from "@/lib/game/bossBattle";

/** One empire that has felled the city's boss, for the banner's honour roll. */
export interface BossConqueror {
  empireId: string;
  empireName: string;
  kills: number;
  lastAt: Date;
}

export interface CityBossState {
  boss: CityBoss;
  /** The boss's reference battle power, after the admin multiplier. */
  power: number;
  turnCost: number;
  /** The viewer's real attack power, computed exactly as the assault computes it. */
  myPower: number;
  myTurns: number;

  /** This life's health pool and what is left of it. */
  hp: number;
  maxHp: number;
  /** Assaults launched against this life. */
  sorties: number;

  /** Set while the tyrant is dead: when it returns, in server time. */
  revivesAt: Date | null;
  /** How long a felled boss stays dead, for the countdown's ceiling. */
  reviveMs: number;
  serverNow: number;

  /** The haul this life is worth, before the chip/kill split. */
  lifeHaul: BossReward;
  heroXp: number;

  /** What one assault of this army is expected to take off, and how many it needs. */
  expectedSortieDamage: number;
  sortiesToKill: number;
  roundsPerSortie: number;
  /** How often this hero's officers read the tyrant right, as a fraction. */
  readChance: number;

  /** A running assault, if one is in flight. */
  activeBattleId: string | null;
  activeEndsAt: Date | null;

  /** Everything that must be true before the attack button is live. */
  canAttack: boolean;
  /** This empire's total victories over this boss, all-time. */
  myKills: number;
  conquerors: BossConqueror[];
}

/** How many conquerors the banner's honour roll lists. */
const CONQUEROR_ROWS = 5;

/**
 * Everything the boss banner renders, for an already-settled empire.
 *
 * Strictly a read: it never opens a boss life and never settles an assault. A
 * player loading the rankings page has not attacked anything, and materialising
 * state for every viewer would write on a GET. Where no life exists yet the pool
 * is reported at full — which is what attacking would create anyway.
 */
export async function getCityBossState(empire: FullEmpire): Promise<CityBossState> {
  const now = new Date();
  const boss = bossForCity(empire.cities);
  const tunables = await getTunables();

  const [guildBonusPct, guildAid, season, life, activeBattle, myKills, recent] =
    await Promise.all([
      getActiveGuildBuffPct(empire.id, "ATTACK", prisma, now),
      getGuildAidBonus(empire.id),
      prisma.gameSeason.findFirst({
        where: { isActive: true },
        select: { startsAt: true, endsAt: true },
      }),
      // The newest life of this tier's boss — alive, or counting down to its
      // return. See `currentLife` in bossSiege.ts for the same rule on the write
      // path.
      prisma.bossSiege.findFirst({
        where: { empireId: empire.id, cityTier: empire.cities },
        orderBy: { createdAt: "desc" },
      }),
      prisma.bossBattle.findFirst({
        where: { empireId: empire.id, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
        select: { id: true, endsAt: true },
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
  const fullHp = bossSiegeMaxHp(
    empire.cities,
    tunables.boss.powerMultiplier,
    tunables.boss.hpMultiplier
  );

  // Dead and still counting down: the pool shown is the *next* life's, at full.
  const dead = life?.revivesAt != null && life.revivesAt > now;
  const alive = life != null && life.killedAt == null && life.hp > 0;
  const maxHp = alive ? life.maxHp : fullHp;
  const hp = alive ? life.hp : fullHp;

  const heroLevel = empire.hero?.level ?? 1;
  const heroAlive = empire.hero != null && !isHeroDead(empire.hero);

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

    hp,
    maxHp,
    sorties: alive ? life.sorties : 0,

    revivesAt: dead ? life.revivesAt : null,
    reviveMs: BOSS_REVIVE_MS,
    serverNow: now.getTime(),

    lifeHaul: bossReward(
      empire.cities,
      seasonPassDay(season, now.getTime()),
      tunables.boss.rewardMultiplier
    ),
    heroXp: bossHeroXp(empire.cities),

    expectedSortieDamage: bossExpectedSortieDamage(myPower, heroLevel, heroAlive),
    sortiesToKill: bossSortiesToKill(myPower, hp, heroLevel, heroAlive),
    roundsPerSortie: BOSS_SORTIE_ROUNDS,
    readChance: bossReadChance(heroLevel, heroAlive),

    activeBattleId: activeBattle?.id ?? null,
    activeEndsAt: activeBattle?.endsAt ?? null,

    canAttack:
      tunables.boss.enabled >= 1 &&
      !dead &&
      activeBattle == null &&
      empire.turns >= turnCost &&
      (empire.army?.soldiers ?? 0) > 0,
    myKills,
    conquerors,
  };
}
