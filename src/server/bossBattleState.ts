import "server-only";
import { prisma } from "@/lib/prisma";
import { getTunables } from "@/lib/game/config";
import { seasonPassDay } from "@/lib/game/seasonPass";
import { bossForCity, bossReward, type BossReward, type CityBoss } from "@/lib/game/bosses";
import {
  BOSS_FURY_MAX,
  BOSS_ROUT_LOSS_FRACTION,
  bossChipFraction,
  bossPayout,
  type BossRound,
} from "@/lib/game/bossBattle";

/**
 * Read model for the arena — the screen an assault plays out on.
 *
 * The one rule here is that **un-elapsed rounds never leave the server**. The whole
 * battle is decided at launch, so shipping the full plan to the client would hand
 * it the ending and reduce the minute to a progress bar with spoilers. `rounds` is
 * therefore filtered to what the clock has already revealed, and the client's only
 * job is to re-read as time passes.
 */
export interface BossArenaState {
  battleId: string;
  boss: CityBoss;
  cityTier: number;

  /** Rounds the plan contains, and how many have been revealed so far. */
  totalRounds: number;
  revealed: BossRound[];

  /** Server clock and deadline, so the countdown never depends on the device's. */
  serverNow: number;
  startedAt: number;
  endsAt: number;
  /** True once the clock has run out and the settle is the next thing to happen. */
  finished: boolean;

  attackPower: number;
  soldiersAtStart: number;
  /** Casualties among the revealed rounds — not yet applied to the army. */
  soldiersLostSoFar: number;

  /** The boss's health, as of the last revealed round. */
  bossHp: number;
  bossMaxHp: number;
  bossHpAtStart: number;
  damageSoFar: number;

  /** Fury meter as of the last revealed round. */
  fury: number;
  furyMax: number;
  routLine: number;

  /** Chip loot the revealed damage has earned so far, for the running readout. */
  earned: BossReward;
}

/** The running assault for `empireId`, or null when there is none to watch. */
export async function getBossArenaState(empireId: string): Promise<BossArenaState | null> {
  const now = new Date();

  const battle = await prisma.bossBattle.findFirst({
    where: { empireId, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
    include: { siege: true },
  });
  if (!battle) return null;

  const [tunables, season] = await Promise.all([
    getTunables(),
    prisma.gameSeason.findFirst({
      where: { isActive: true },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const plan = Array.isArray(battle.log) ? (battle.log as unknown as BossRound[]) : [];
  const elapsed = now.getTime() - battle.startedAt.getTime();
  const revealed = plan.filter((r) => r.at <= elapsed);
  const last = revealed.at(-1);

  const damageSoFar = revealed.reduce((sum, r) => sum + r.damage, 0);
  const lifeHaul = bossReward(
    battle.siege.cityTier,
    seasonPassDay(season, now.getTime()),
    tunables.boss.rewardMultiplier
  );

  return {
    battleId: battle.id,
    boss: bossForCity(battle.siege.cityTier),
    cityTier: battle.siege.cityTier,

    totalRounds: plan.length,
    revealed,

    serverNow: now.getTime(),
    startedAt: battle.startedAt.getTime(),
    endsAt: battle.endsAt.getTime(),
    finished: battle.endsAt <= now,

    attackPower: battle.attackPower,
    soldiersAtStart: battle.soldiersAtStart,
    soldiersLostSoFar: revealed.reduce((sum, r) => sum + r.soldiersLost, 0),

    // Falls back to the pre-assault health before the first round lands, so the
    // bar starts where the banner left it rather than at zero.
    bossHp: last ? last.bossHpAfter : battle.hpAtStart,
    bossMaxHp: battle.siege.maxHp,
    bossHpAtStart: battle.hpAtStart,
    damageSoFar,

    fury: last ? last.fury : 0,
    furyMax: BOSS_FURY_MAX,
    routLine: BOSS_ROUT_LOSS_FRACTION,

    earned: bossPayout(
      lifeHaul,
      bossChipFraction(Math.min(damageSoFar, battle.hpAtStart), battle.siege.maxHp)
    ),
  };
}
