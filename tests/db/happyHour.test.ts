import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { mineTicksWithHappyHour } from "@/server/happyHour";
import { REGULAR_TICK_MS } from "@/lib/game/constants";

/**
 * Which Happy Hour windows the lazy mine clock is even allowed to see.
 *
 * The arithmetic that prices a backlog per tick is pure and covered in
 * tests/unit/happyHour.test.ts. What is NOT pure — and is therefore what this
 * file exists for — is the `WHERE` clause in front of it: `mineTicksWithHappyHour`
 * decides which rows overlap the stretch being settled, and a row wrongly
 * included pays a golden rate on ordinary mining while a row wrongly excluded
 * quietly robs a player who was offline while a window ran.
 *
 * The cases that can only be checked against a real database are the ones about
 * a *closed* row: a stopped window carries `endsAt = <when it stopped>` and
 * `isActive = false`, and it still has to be found — because the player who was
 * away all night settles it hours later.
 */

const prisma = new PrismaClient();
const TAG = `hh${Date.now().toString(36)}`;

/** Whole tick boundaries, so the arithmetic lands on exact counts. */
const TICK = REGULAR_TICK_MS;
const NOW = Math.floor(Date.now() / TICK) * TICK;
const ticksAgo = (n: number) => new Date(NOW - n * TICK);
const now = new Date(NOW);

async function window(opts: {
  bonusPct: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  boostMines?: boolean;
}) {
  return prisma.happyHour.create({
    data: {
      title: `${TAG}-${opts.bonusPct}`,
      bonusPct: opts.bonusPct,
      boostMines: opts.boostMines ?? true,
      isActive: opts.isActive,
      startsAt: opts.startsAt,
      endsAt: opts.endsAt,
    },
  });
}

afterEach(async () => {
  await prisma.happyHour.deleteMany({ where: { title: { startsWith: TAG } } });
});

afterAll(async () => {
  await prisma.happyHour.deleteMany({ where: { title: { startsWith: TAG } } });
  await prisma.$disconnect();
});

/** A 12-tick backlog: the player was away an hour. */
const BACKLOG = 12;
const lastUpdate = () => ticksAgo(BACKLOG);

/**
 * What this backlog is worth before any of *our* windows exist.
 *
 * The lookup deliberately reads every window in the database, so a development
 * database with a real release in its history would make every absolute
 * assertion here wrong. Measuring the delta is the honest test: it asserts what
 * the rows under test add, which is the thing the SQL decides.
 */
let baseline = BACKLOG;

beforeAll(async () => {
  baseline = await mineTicksWithHappyHour(BACKLOG, lastUpdate(), now);
});

/** The backlog's value once our windows are in, as a delta over the baseline. */
async function extra(): Promise<number> {
  return (await mineTicksWithHappyHour(BACKLOG, lastUpdate(), now)) - baseline;
}

describe("mineTicksWithHappyHour", () => {
  it("pays nothing when no window ever ran", async () => {
    expect(await extra()).toBe(0);
  });

  it("pays a closed window that ran while the player was offline", async () => {
    // Opened 8 ticks ago, closed 4 ticks ago: 4 ticks at ×2 = 4 extra.
    await window({
      bonusPct: 100,
      startsAt: ticksAgo(8),
      endsAt: ticksAgo(4),
      isActive: false,
    });
    expect(await extra()).toBe(4);
  });

  it("ignores a window that closed before the backlog began", async () => {
    await window({
      bonusPct: 900,
      startsAt: ticksAgo(30),
      endsAt: ticksAgo(BACKLOG),
      isActive: false,
    });
    expect(await extra()).toBe(0);
  });

  it("runs an open-ended live window to the end of the backlog", async () => {
    await window({
      bonusPct: 100,
      startsAt: ticksAgo(5),
      endsAt: null,
      isActive: true,
    });
    expect(await extra()).toBe(5);
  });

  it("stops paying an open-ended window at the moment it was stopped", async () => {
    // Stopping writes a real `endsAt` precisely so this stays true — an
    // open-ended row left at `endsAt: null` would keep paying forever.
    await window({
      bonusPct: 100,
      startsAt: ticksAgo(10),
      endsAt: ticksAgo(7),
      isActive: false,
    });
    expect(await extra()).toBe(3);
  });

  it("never pays a window that was created but never released", async () => {
    await window({ bonusPct: 900, startsAt: null, endsAt: null, isActive: false });
    expect(await extra()).toBe(0);
  });

  it("never pays a window whose start is still in the future", async () => {
    await window({
      bonusPct: 900,
      startsAt: new Date(NOW + 10 * TICK),
      endsAt: new Date(NOW + 20 * TICK),
      isActive: true,
    });
    expect(await extra()).toBe(0);
  });

  it("ignores a window that boosts everything except mines", async () => {
    await window({
      bonusPct: 900,
      startsAt: ticksAgo(8),
      endsAt: null,
      isActive: true,
      boostMines: false,
    });
    expect(await extra()).toBe(0);
  });

  it("splits a backlog between two back-to-back windows, none double-counted", async () => {
    await window({
      bonusPct: 100,
      startsAt: ticksAgo(10),
      endsAt: ticksAgo(6),
      isActive: false,
    });
    await window({
      bonusPct: 100,
      startsAt: ticksAgo(6),
      endsAt: ticksAgo(2),
      isActive: false,
    });
    // 4 ticks each at ×2, and the seam tick belongs to exactly one of them.
    expect(await extra()).toBe(8);
  });

  it("leaves an empty backlog alone even with a window live", async () => {
    await window({
      bonusPct: 900,
      startsAt: ticksAgo(4),
      endsAt: null,
      isActive: true,
    });
    expect(await mineTicksWithHappyHour(0, now, now)).toBe(0);
  });
});
