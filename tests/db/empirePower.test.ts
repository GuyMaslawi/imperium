import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { computePower, syncEmpirePower } from "@/server/empirePower";
import {
  getEmpireGeneralPower,
  getEmpireMilitaryPower,
  getEmpireSpyPower,
} from "@/lib/game/power";
import { weaponsOfCategory } from "@/lib/game/weapons";

/**
 * The denormalisation guard.
 *
 * `Empire.militaryPower` and friends are a cache of a pure function, and the
 * failure mode of any such cache is silence: nothing throws when it drifts, the
 * ladder is simply wrong. These tests assert the one property that matters —
 * **the stored figures equal the computed ones** — after each kind of mutation,
 * and that the settle path repairs a figure someone corrupted behind its back.
 */

const prisma = new PrismaClient();
const TAG = `pw${Date.now().toString(36)}`;

const ATTACK_WEAPON = weaponsOfCategory("ATTACK")[0]!;
const SPY_WEAPON = weaponsOfCategory("SPY")[0]!;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  await prisma.$disconnect();
});

async function makeEmpire(name: string, soldiers = 100, spies = 10) {
  const user = await prisma.user.create({
    data: {
      email: `${name}@${TAG}.test`,
      name,
      passwordHash: "x",
      emailVerified: new Date(),
    },
  });
  const empire = await prisma.empire.create({
    data: { userId: user.id, name: `${TAG}-${name}`, gold: 1e12, turns: 1000 },
  });
  await prisma.army.create({ data: { empireId: empire.id, soldiers, spies } });
  await syncEmpirePower(prisma, empire.id);
  return empire;
}

/** Read the stored figures and the freshly computed ones side by side. */
async function bothWays(empireId: string) {
  const empire = await prisma.empire.findUniqueOrThrow({
    where: { id: empireId },
    select: {
      militaryPower: true,
      generalPower: true,
      spyPower: true,
      army: { select: { soldiers: true, spies: true } },
      weapons: { select: { weaponKey: true, quantity: true } },
    },
  });
  return {
    stored: {
      militaryPower: empire.militaryPower,
      generalPower: empire.generalPower,
      spyPower: empire.spyPower,
    },
    computed: {
      militaryPower: getEmpireMilitaryPower(empire.army, empire.weapons),
      generalPower: getEmpireGeneralPower(empire.army, empire.weapons),
      spyPower: getEmpireSpyPower(empire.army, empire.weapons),
    },
  };
}

describe("computePower", () => {
  it("agrees with the power functions the rest of the game reads", () => {
    const army = { soldiers: 250, spies: 40 };
    const weapons = [{ weaponKey: ATTACK_WEAPON.key, quantity: 7 }];
    expect(computePower(army, weapons)).toEqual({
      militaryPower: getEmpireMilitaryPower(army, weapons),
      generalPower: getEmpireGeneralPower(army, weapons),
      spyPower: getEmpireSpyPower(army, weapons),
    });
  });

  it("treats a missing army as zero rather than throwing", () => {
    expect(computePower(null, [])).toEqual({
      militaryPower: 0,
      generalPower: 0,
      spyPower: 0,
    });
  });
});

describe("syncEmpirePower", () => {
  it("stores figures that match the computed ones on a fresh empire", async () => {
    const empire = await makeEmpire("fresh");
    const { stored, computed } = await bothWays(empire.id);
    expect(stored).toEqual(computed);
    expect(stored.militaryPower).toBeGreaterThan(0);
  });

  it("tracks a change in soldiers", async () => {
    const empire = await makeEmpire("soldiers");
    const before = (await bothWays(empire.id)).stored.militaryPower;

    await prisma.army.update({
      where: { empireId: empire.id },
      data: { soldiers: { increment: 900 } },
    });
    await syncEmpirePower(prisma, empire.id);

    const { stored, computed } = await bothWays(empire.id);
    expect(stored).toEqual(computed);
    expect(stored.militaryPower).toBeGreaterThan(before);
  });

  it("tracks a change in spies without moving military power", async () => {
    const empire = await makeEmpire("spies");
    const before = await bothWays(empire.id);

    await prisma.army.update({
      where: { empireId: empire.id },
      data: { spies: { increment: 500 } },
    });
    await syncEmpirePower(prisma, empire.id);

    const after = await bothWays(empire.id);
    expect(after.stored).toEqual(after.computed);
    expect(after.stored.spyPower).toBeGreaterThan(before.stored.spyPower);
    // Spies do not fight; only the intelligence and general figures move.
    expect(after.stored.militaryPower).toBe(before.stored.militaryPower);
    expect(after.stored.generalPower).toBeGreaterThan(before.stored.generalPower);
  });

  it("tracks weapons bought and sold", async () => {
    const empire = await makeEmpire("arsenal");
    const base = (await bothWays(empire.id)).stored.militaryPower;

    await prisma.empireWeapon.create({
      data: { empireId: empire.id, weaponKey: ATTACK_WEAPON.key, quantity: 25 },
    });
    await syncEmpirePower(prisma, empire.id);
    const armed = await bothWays(empire.id);
    expect(armed.stored).toEqual(armed.computed);
    expect(armed.stored.militaryPower).toBeGreaterThan(base);

    await prisma.empireWeapon.deleteMany({ where: { empireId: empire.id } });
    await syncEmpirePower(prisma, empire.id);
    const disarmed = await bothWays(empire.id);
    expect(disarmed.stored).toEqual(disarmed.computed);
    expect(disarmed.stored.militaryPower).toBe(base);
  });

  it("counts a spy weapon into the spy figure but not the military one", async () => {
    const empire = await makeEmpire("spygear");
    const before = (await bothWays(empire.id)).stored;

    await prisma.empireWeapon.create({
      data: { empireId: empire.id, weaponKey: SPY_WEAPON.key, quantity: 10 },
    });
    await syncEmpirePower(prisma, empire.id);

    const after = await bothWays(empire.id);
    expect(after.stored).toEqual(after.computed);
    expect(after.stored.spyPower).toBeGreaterThan(before.spyPower);
    expect(after.stored.militaryPower).toBe(before.militaryPower);
  });

  it("is idempotent — syncing twice changes nothing", async () => {
    const empire = await makeEmpire("idem");
    const once = (await bothWays(empire.id)).stored;
    await syncEmpirePower(prisma, empire.id);
    expect((await bothWays(empire.id)).stored).toEqual(once);
  });

  it("does not fail on an empire that no longer exists", async () => {
    // updateMany, not update: a cascading delete mid-transaction must not turn
    // bookkeeping into a rolled-back payout.
    await expect(syncEmpirePower(prisma, "no-such-empire-id")).resolves.toBeDefined();
  });

  it("repairs a figure corrupted behind its back", async () => {
    // This is the self-healing property the design leans on: a write path that
    // forgets to sync costs a stale ladder until the next settle, not a
    // permanently wrong one.
    const empire = await makeEmpire("drift");
    await prisma.empire.update({
      where: { id: empire.id },
      data: { militaryPower: 999_999_999, spyPower: -5 },
    });
    const drifted = await bothWays(empire.id);
    expect(drifted.stored).not.toEqual(drifted.computed);

    await syncEmpirePower(prisma, empire.id);
    const repaired = await bothWays(empire.id);
    expect(repaired.stored).toEqual(repaired.computed);
  });
});

describe("the ranked query", () => {
  it("orders by the stored column exactly as the computed figures would", async () => {
    const weak = await makeEmpire("weak", 10, 1);
    const mid = await makeEmpire("mid", 500, 1);
    const strong = await makeEmpire("strong", 5000, 1);

    const rows = await prisma.empire.findMany({
      where: { id: { in: [weak.id, mid.id, strong.id] } },
      orderBy: { militaryPower: "desc" },
      select: { id: true, militaryPower: true },
    });

    expect(rows.map((r) => r.id)).toEqual([strong.id, mid.id, weak.id]);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].militaryPower).toBeGreaterThan(rows[i].militaryPower);
    }
  });
});
