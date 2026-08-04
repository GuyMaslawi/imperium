import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createBots, planBots, rearmBot, restoreBotGarrison } from "@/server/bots";
import { applyPendingUpdates } from "@/lib/game/updates";
import { notStaffOrBot } from "@/lib/bot";
import { computePower } from "@/server/empirePower";
import { BOT_RESTORE_MS, BOT_SOLDIERS } from "@/lib/game/bots";
import { ENSLAVE_MIN_SOLDIERS, isProductionBuilding } from "@/lib/game/constants";

/**
 * Bots, end to end against the real database.
 *
 * Three properties matter here and none of them can be checked without Postgres:
 *
 *  1. A planted bot is a **legal target** — no new-player shield, not staff, and
 *     standing in the city ladder where a player can find it. Get any one of
 *     those wrong and the whole feature does nothing, silently.
 *  2. A raided bot **grows back**, exactly once per window, even when two
 *     raiders arrive together. That is a guarded `updateMany` claim, which is
 *     precisely the kind of thing a mock would confirm and the database would
 *     not.
 *  3. A bot is **not a contestant**: it must never appear in a query filtered by
 *     `notStaffOrBot`, which is what the podium, the prizes and the hall of fame
 *     are built from.
 */

const prisma = new PrismaClient();
const TIER = 7;

/** Every empire this file created, by id — the teardown reads it. */
let plantedIds: string[] = [];

afterAll(async () => {
  const empires = await prisma.empire.findMany({
    where: { id: { in: plantedIds } },
    select: { userId: true },
  });
  await prisma.user.deleteMany({ where: { id: { in: empires.map((e) => e.userId) } } });
  await prisma.$disconnect();
});

beforeAll(async () => {
  const plans = await planBots({ cities: [TIER], perCity: 2 });
  const { created } = await createBots(plans);
  expect(created).toBe(2);
  plantedIds = (
    await prisma.empire.findMany({
      where: { isBot: true, cities: TIER, name: { in: plans.map((p) => p.name) } },
      select: { id: true },
    })
  ).map((e) => e.id);
  expect(plantedIds).toHaveLength(2);
});

describe("a planted bot", () => {
  it("is a legal target: no shield, not staff, in the right city", async () => {
    const bot = await prisma.empire.findUniqueOrThrow({
      where: { id: plantedIds[0] },
      select: { cities: true, isBot: true, isStaff: true, protectedUntil: true, diamonds: true },
    });
    expect(bot.cities).toBe(TIER);
    expect(bot.isBot).toBe(true);
    // Both of these would make it unattackable — see targetBlockedReason.
    expect(bot.isStaff).toBe(false);
    expect(bot.protectedUntil).toBeNull();
    expect(bot.diamonds).toBe(0);
  });

  it("cannot be signed in to", async () => {
    const owner = await prisma.empire
      .findUniqueOrThrow({
        where: { id: plantedIds[0] },
        select: { user: { select: { passwordHash: true, emailVerified: true, role: true } } },
      })
      .then((e) => e.user);
    expect(owner.passwordHash).toBeNull();
    expect(owner.emailVerified).toBeNull();
    expect(owner.role).toBe("USER");
  });

  it("stands in its city ladder — the one board it has to be on", async () => {
    const inLadder = await prisma.empire.count({
      where: { cities: TIER, isStaff: false, id: { in: plantedIds } },
    });
    expect(inLadder).toBe(2);
  });

  it("is absent from every board that pays or is remembered", async () => {
    const contending = await prisma.empire.count({
      where: { ...notStaffOrBot, id: { in: plantedIds } },
    });
    expect(contending).toBe(0);
  });

  it("fields the fixed garrison and nothing else", async () => {
    const bot = await prisma.empire.findUniqueOrThrow({
      where: { id: plantedIds[0] },
      select: {
        militaryPower: true,
        army: { select: { soldiers: true, spies: true } },
        weapons: { select: { weaponKey: true, quantity: true } },
        bot: { select: { targetPower: true, soldiers: true } },
      },
    });
    expect(bot.army?.soldiers).toBe(BOT_SOLDIERS);
    expect(bot.army?.soldiers).toBe(bot.bot?.soldiers);
    expect(bot.army?.spies).toBe(0);
    // Nothing to buy an arsenal with, so no arsenal rows at all.
    expect(bot.weapons).toHaveLength(0);
    // The stored figure is the computed one — the invariant empirePower guards.
    expect(bot.militaryPower).toBe(computePower(bot.army, bot.weapons).militaryPower);
    expect(bot.militaryPower).toBeCloseTo(bot.bot!.targetPower, 5);
  });

  it("holds too few soldiers to be farmed for slaves", async () => {
    // The bot rebuilds every hour, so a garrison at or above the enslavement
    // floor would be an unlimited supply of mine slaves to whoever found it.
    const bot = await prisma.empireBot.findUniqueOrThrow({
      where: { empireId: plantedIds[0] },
    });
    expect(bot.soldiers).toBeLessThan(ENSLAVE_MIN_SOLDIERS);
  });

  it("owns mines with slaves on them, so a raid on it is worth something", async () => {
    const bot = await prisma.empire.findUniqueOrThrow({
      where: { id: plantedIds[0] },
      select: {
        army: { select: { mineSlaves: true } },
        buildings: { select: { type: true, level: true, slavesAssigned: true } },
      },
    });
    const mines = bot.buildings.filter((b) => isProductionBuilding(b.type));
    expect(mines.length).toBeGreaterThan(0);
    for (const mine of mines) {
      expect(mine.level).toBeGreaterThan(1);
      expect(mine.slavesAssigned).toBeGreaterThan(0);
    }
    // The pool covers what stands in the mines — the invariant every assignment
    // is validated against.
    const assigned = mines.reduce((sum, m) => sum + m.slavesAssigned, 0);
    expect(bot.army?.mineSlaves).toBeGreaterThanOrEqual(assigned);
  });
});

describe("the garrison grows back", () => {
  it("does nothing while the window is still open", async () => {
    const id = plantedIds[0];
    await prisma.army.update({ where: { empireId: id }, data: { soldiers: 1 } });
    // Just planted, so `restoredAt` is minutes old at most.
    expect(await restoreBotGarrison(prisma, id, new Date())).toBe(false);
    const army = await prisma.army.findUniqueOrThrow({ where: { empireId: id } });
    expect(army.soldiers).toBe(1);
  });

  it("refills to the stored garrison once the window has passed", async () => {
    const id = plantedIds[0];
    const bot = await prisma.empireBot.findUniqueOrThrow({ where: { empireId: id } });
    await prisma.empireBot.update({
      where: { empireId: id },
      data: { restoredAt: new Date(Date.now() - BOT_RESTORE_MS - 1000) },
    });

    expect(await restoreBotGarrison(prisma, id, new Date())).toBe(true);
    const after = await prisma.empire.findUniqueOrThrow({
      where: { id },
      select: {
        militaryPower: true,
        army: { select: { soldiers: true, spies: true } },
        weapons: { select: { weaponKey: true, quantity: true } },
      },
    });
    expect(after.army?.soldiers).toBe(bot.soldiers);
    expect(after.army?.spies).toBe(bot.spies);
    // The ladder column moves with the army it is derived from.
    expect(after.militaryPower).toBe(computePower(after.army, after.weapons).militaryPower);
  });

  it("refills exactly once when two raiders arrive together", async () => {
    const id = plantedIds[1];
    await prisma.empireBot.update({
      where: { empireId: id },
      data: { restoredAt: new Date(Date.now() - BOT_RESTORE_MS - 1000) },
    });
    await prisma.army.update({ where: { empireId: id }, data: { soldiers: 3 } });

    const now = new Date();
    const results = await Promise.all([
      restoreBotGarrison(prisma, id, now),
      restoreBotGarrison(prisma, id, now),
      restoreBotGarrison(prisma, id, now),
    ]);
    // The claim is guarded on the exact `restoredAt` that was read, so exactly
    // one of the three writes, and the other two find the rebuilt row.
    expect(results.filter(Boolean)).toHaveLength(1);

    const bot = await prisma.empireBot.findUniqueOrThrow({ where: { empireId: id } });
    const army = await prisma.army.findUniqueOrThrow({ where: { empireId: id } });
    expect(army.soldiers).toBe(bot.soldiers);
  });

  it("is what the lazy clock does when a raider loads the bot as a target", async () => {
    const id = plantedIds[0];
    await prisma.empireBot.update({
      where: { empireId: id },
      data: { restoredAt: new Date(Date.now() - BOT_RESTORE_MS - 1000) },
    });
    await prisma.army.update({ where: { empireId: id }, data: { soldiers: 2 } });

    // This is the real entry point: attackEmpire and spyOnEmpire both resolve
    // their target through it, and the value it returns is what the battle is
    // fought with — so the refill has to be visible in the returned snapshot,
    // not only in the database.
    const settled = await applyPendingUpdates(id);
    const bot = await prisma.empireBot.findUniqueOrThrow({ where: { empireId: id } });
    expect(settled.army?.soldiers).toBe(bot.soldiers);
  });

  it("re-arms on demand, ignoring the window", async () => {
    const id = plantedIds[0];
    await prisma.army.update({ where: { empireId: id }, data: { soldiers: 0 } });
    expect(await rearmBot(id)).toBe(true);

    const bot = await prisma.empireBot.findUniqueOrThrow({ where: { empireId: id } });
    const army = await prisma.army.findUniqueOrThrow({ where: { empireId: id } });
    expect(army.soldiers).toBe(bot.soldiers);
  });

  it("refuses to re-arm an empire that is not a bot", async () => {
    const player = await prisma.empire.findFirst({
      where: { isBot: false },
      select: { id: true },
    });
    if (player) expect(await rearmBot(player.id)).toBe(false);
  });
});
