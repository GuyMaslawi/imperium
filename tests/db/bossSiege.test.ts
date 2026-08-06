import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { startBossAssault, settleDueAssault } from "@/server/bossSiege";
import { bossReward } from "@/lib/game/bosses";
import { seasonPassDay } from "@/lib/game/seasonPass";
import {
  BOSS_CASUALTIES,
  BOSS_CHIP_SHARE,
  BOSS_GRADE_BONUS,
  BOSS_KILL_SHARE,
  bossGrade,
} from "@/lib/game/bossBattle";

/**
 * The city-boss siege's economic bounds, against a real database.
 *
 * The siege traded the old one-victory-per-cycle cap for an arithmetic one: chip
 * loot is pro-rata against the life's `maxHp`, so the whole haul is payable at
 * most once per boss life and a life takes an hour to return. These are the tests
 * that hold that bound down, plus the two concurrency invariants (a march and a
 * settle each happen exactly once) that only a real Postgres can answer.
 *
 * Written during the 2026-07-30 pentest; the grade test is the one that found a
 * live exploit.
 */

const prisma = new PrismaClient();
const TAG = `bs${Date.now().toString(36)}`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  await prisma.$disconnect();
});

async function makeWarlord(name: string, soldiers: number, turns = 20_000) {
  const user = await prisma.user.create({
    data: {
      email: `${name}@${TAG}.test`,
      name,
      passwordHash: "x",
      emailVerified: new Date(),
    },
  });
  return prisma.empire.create({
    data: {
      userId: user.id,
      name: `${TAG}-${name}`,
      cities: 1,
      turns,
      gold: 0,
      wood: 0,
      iron: 0,
      stone: 0,
      citizens: 0,
      army: { create: { soldiers, spies: 0, mineSlaves: 0 } },
      hero: { create: { level: 40 } },
    },
  });
}

/**
 * Finish a running assault without waiting out its minute: rewind the deadline and
 * settle. The outcome was decided at launch, so nothing about the result depends
 * on the clock — which is exactly the property that makes this safe to do.
 */
async function finishAssault(empireId: string) {
  await prisma.bossBattle.updateMany({
    where: { empireId, status: "ACTIVE" },
    data: { endsAt: new Date(Date.now() - 1_000) },
  });
  return settleDueAssault(empireId);
}

/** The haul one life of the tier-1 boss is worth right now. */
async function oneLifeHaul() {
  const season = await prisma.gameSeason.findFirst({
    where: { isActive: true },
    select: { startsAt: true, endsAt: true },
  });
  return bossReward(1, seasonPassDay(season, Date.now()), 1);
}

describe("the per-life loot budget", () => {
  it("cannot be farmed past one life's haul, however many sorties are thrown at it", async () => {
    // Twenty marches at an army far over the wall. The first fells the tyrant; the
    // rest must be refused by the revive clock, so the total haul stays inside
    // (chip + kill x best grade) of a SINGLE life.
    const me = await makeWarlord("budget", 400_000);
    const before = await prisma.empire.findUniqueOrThrow({ where: { id: me.id } });

    let launched = 0;
    let refused = 0;
    for (let i = 0; i < 20; i++) {
      const out = await startBossAssault(me.id);
      if ("error" in out) {
        refused++;
        continue;
      }
      launched++;
      await finishAssault(me.id);
    }

    const after = await prisma.empire.findUniqueOrThrow({ where: { id: me.id } });
    const haul = await oneLifeHaul();
    const ceiling = BOSS_CHIP_SHARE + BOSS_KILL_SHARE * BOSS_GRADE_BONUS.S;

    expect(launched).toBe(1);
    expect(refused).toBe(19);
    // Payouts round to hundreds, so allow a little over the arithmetic ceiling.
    expect(after.gold - before.gold).toBeLessThanOrEqual(
      Math.ceil(haul.gold * ceiling * 1.01)
    );
  });
});

describe("racing the boss", () => {
  it("turns twenty concurrent marches into one battle and one turn debit", async () => {
    const me = await makeWarlord("racelaunch", 50_000);
    const before = await prisma.empire.findUniqueOrThrow({ where: { id: me.id } });

    await Promise.all(Array.from({ length: 20 }, () => startBossAssault(me.id)));

    const after = await prisma.empire.findUniqueOrThrow({ where: { id: me.id } });
    expect(await prisma.bossBattle.count({ where: { empireId: me.id } })).toBe(1);
    expect(await prisma.bossSiege.count({ where: { empireId: me.id } })).toBe(1);
    // One march paid for, not twenty. The empire row lock is what does this.
    expect(before.turns - after.turns).toBe(300);
  });

  it("pays a finished assault exactly once under twenty concurrent settles", async () => {
    const me = await makeWarlord("racesettle", 50_000);
    await startBossAssault(me.id);
    await prisma.bossBattle.updateMany({
      where: { empireId: me.id, status: "ACTIVE" },
      data: { endsAt: new Date(Date.now() - 1_000) },
    });

    const results = await Promise.all(
      Array.from({ length: 20 }, () => settleDueAssault(me.id))
    );

    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect(await prisma.bossFight.count({ where: { empireId: me.id } })).toBe(1);
    // One report, one inbox notice — a doubled toast would mean a doubled payout.
    expect(
      await prisma.message.count({ where: { empireId: me.id, kind: "BATTLE" } })
    ).toBe(1);
  });
});

describe("the grade is scored on the battle that was fought", () => {
  it("cannot be bought by making the army disappear mid-assault", async () => {
    // The 2026-07-30 exploit. Casualties are clamped at the settle to what is
    // actually standing (you cannot lose soldiers you no longer have), and the
    // grade used to read that clamped figure — so an army that vanished during the
    // minute scored *better* than one that stood and fought. Measured before the
    // fix: casualties 938 -> 0, grade C -> S, haul 150,000 -> 183,800 gold.
    //
    // The only thing that reduces Army.soldiers in play is losing a defence, so an
    // alt attacking you inside your own assault window bought the grade — and kept
    // the soldiers it took. Setting the row to zero here stands in for that.
    // Comparing two empires would only compare two different dice rolls, so this
    // pins the invariant instead: the grade must be exactly the function of the
    // stored plan, and must not move when the live army does.
    const dodger = await makeWarlord("dodger", 20_000);
    await startBossAssault(dodger.id);

    const plan = await prisma.bossBattle.findFirstOrThrow({
      where: { empireId: dodger.id, status: "ACTIVE" },
    });
    const fromPlan = bossGrade(
      plan.correctCounters,
      plan.decisions,
      plan.soldiersLost / plan.soldiersAtStart
    );

    // The army walks away with the fight already rolled and a minute left to run.
    await prisma.army.update({
      where: { empireId: dodger.id },
      data: { soldiers: 0 },
    });
    await finishAssault(dodger.id);

    const report = await prisma.bossFight.findFirstOrThrow({
      where: { empireId: dodger.id },
    });

    // The clamp still protects the army row: no soldiers are taken from an empty
    // one, and the row never goes negative.
    expect(report.soldiersLost).toBe(0);
    const army = await prisma.army.findUniqueOrThrow({
      where: { empireId: dodger.id },
    });
    expect(army.soldiers).toBe(0);

    // …but it buys nothing. The grade is the plan's grade, scored on the casualties
    // the battle actually inflicted, not on the empty army the settle found.
    if (report.victory) {
      expect(report.grade).toBe(fromPlan);
      // While the tyrant draws no blood (BOSS_ROUND_LOSS_BASE is 0 — see the note
      // on it) every plan records zero casualties, so "there WAS blood to score"
      // is vacuous rather than false, and asserting it would fail on a deliberate
      // design decision. The invariant above is the one that caught the exploit
      // and it stands either way: the grade comes from the stored plan, not from
      // the live army. Gated on the same switch every screen reads, so restoring
      // casualties restores this assertion on the same deploy.
      if (BOSS_CASUALTIES) expect(plan.soldiersLost).toBeGreaterThan(0);
    }
  });
});
