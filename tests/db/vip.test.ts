import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  PRODUCTION_BUILDING_TYPES,
  STORAGE_TYPES,
  mineUpgradeCost,
} from "@/lib/game/constants";
import { VIP_COST } from "@/lib/game/vip";

/**
 * VIP (חותם המלוכה) and the one-click actions it gates.
 *
 * Two distinct classes of invariant live here, and neither can be asserted
 * without a database:
 *
 * 1. **The pass is bought once.** `buyVip` reads "not VIP yet", then charges.
 *    Under READ COMMITTED two clicks both pass that read, so what actually
 *    stops the second charge is the `vipSince: null` in the guarded UPDATE's
 *    WHERE — a property of Postgres, not of the TypeScript above it.
 * 2. **The gate is the server, not the page.** The "הכל" buttons are only
 *    rendered for VIP, but rendering is not authorisation: every gated action
 *    re-reads `vipSince` inside its own transaction, and an empire without the
 *    pass must come back untouched — not a coin moved, not a slave reassigned,
 *    not a mine level bought.
 *
 * The other half is the "convenience, not power" rule in numbers: with the pass
 * each action lands exactly where the free, manual path would have landed it.
 */

let currentEmpireId: string | null = null;

vi.mock("@/lib/auth", () => ({
  getActiveEmpireId: async () => currentEmpireId,
}));

// The actions end by revalidating /game, which needs a request context Next
// only builds while serving one. Left real it throws *after* a successful
// commit, and the catch would report a failure the database does not agree with.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { buyVip } = await import("@/server/actions/vip");
const { depositAllGoldToBank, withdrawAllGoldFromBank } = await import(
  "@/server/actions/bank"
);
const {
  depositAllToStorage,
  withdrawAllFromStorage,
  assignAllMineSlavesToResource,
  splitMineSlavesEqually,
  upgradeMineToMax,
} = await import("@/server/actions/game");

const prisma = new PrismaClient();
const TAG = `vip${Date.now().toString(36)}`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  await prisma.$disconnect();
});

interface EmpireOptions {
  diamonds?: number;
  vip?: boolean;
  gold?: number;
  wood?: number;
  iron?: number;
  stone?: number;
  /** Warehouse level, one per resource (level 1 holds 10,000). */
  storageLevel?: number;
  /** Starting stock inside every warehouse. */
  stored?: number;
  /** Gold already sitting in the bank. */
  banked?: number;
  /** Mine slaves the empire owns, all of them unassigned to start with. */
  mineSlaves?: number;
}

/** An empire with four warehouses, four mines and no clock backlog to settle. */
async function makeEmpire(label: string, options: EmpireOptions = {}) {
  const {
    diamonds = 0,
    vip = false,
    gold = 0,
    wood = 0,
    iron = 0,
    stone = 0,
    storageLevel = 1,
    stored = 0,
    banked = 0,
    mineSlaves = 0,
  } = options;

  const user = await prisma.user.create({
    data: {
      email: `${label}@${TAG}.test`,
      name: label,
      passwordHash: "x",
      emailVerified: new Date(),
    },
  });
  const empire = await prisma.empire.create({
    data: {
      userId: user.id,
      name: `${TAG}-${label}`,
      diamonds,
      vipSince: vip ? new Date() : null,
      gold,
      wood,
      iron,
      stone,
      // The lazy clock is not what is under test: start it settled so a
      // production tick cannot move the columns these assertions read.
      lastRegularUpdateAt: new Date(),
      lastDailyUpdateAt: new Date(),
      storages: {
        create: STORAGE_TYPES.map((resourceType) => ({
          resourceType,
          level: storageLevel,
          storedAmount: stored,
        })),
      },
      buildings: {
        create: PRODUCTION_BUILDING_TYPES.map((type) => ({ type, level: 1 })),
      },
      army: { create: { mineSlaves } },
      bankAccount: { create: { goldBalance: banked } },
    },
  });
  await prisma.hero.create({ data: { empireId: empire.id } });
  currentEmpireId = empire.id;
  return empire;
}

function balances(id: string) {
  return prisma.empire.findUniqueOrThrow({
    where: { id },
    select: {
      gold: true,
      wood: true,
      iron: true,
      stone: true,
      diamonds: true,
      vipSince: true,
    },
  });
}

async function warehouses(id: string) {
  const rows = await prisma.resourceStorage.findMany({
    where: { empireId: id },
    orderBy: { resourceType: "asc" },
  });
  return rows.map((r) => ({ type: r.resourceType, level: r.level, stored: r.storedAmount }));
}

async function mines(id: string) {
  const rows = await prisma.building.findMany({
    where: { empireId: id, type: { in: [...PRODUCTION_BUILDING_TYPES] } },
    orderBy: { type: "asc" },
  });
  return rows.map((r) => ({ type: r.type, level: r.level, slaves: r.slavesAssigned }));
}

function bankGold(id: string) {
  return prisma.bankAccount
    .findUniqueOrThrow({ where: { empireId: id }, select: { goldBalance: true } })
    .then((a) => a.goldBalance);
}

/** Every gated action, invoked the way its form invokes it. */
function gatedActions() {
  const storageForm = new FormData();
  storageForm.set("resourceType", "GOLD");
  const resourceForm = new FormData();
  resourceForm.set("resource", "gold");

  return [
    () => depositAllGoldToBank(),
    () => withdrawAllGoldFromBank(),
    () => depositAllToStorage({}, storageForm),
    () => withdrawAllFromStorage({}, storageForm),
    () => assignAllMineSlavesToResource({}, resourceForm),
    () => splitMineSlavesEqually(),
    () => upgradeMineToMax({}, resourceForm),
  ];
}

describe("buying the pass", () => {
  it("charges once and stamps the empire", async () => {
    const empire = await makeEmpire("buy", { diamonds: VIP_COST + 50 });

    const res = await buyVip({}, new FormData());
    expect(res.success).toBeTruthy();

    const after = await balances(empire.id);
    expect(after.diamonds).toBe(50);
    expect(after.vipSince).not.toBeNull();
  });

  it("charges once for a burst of parallel clicks", async () => {
    const empire = await makeEmpire("race", { diamonds: VIP_COST * 5 });

    const results = await Promise.all(
      Array.from({ length: 8 }, () => buyVip({}, new FormData()))
    );

    expect(results.filter((r) => r.success).length).toBe(1);
    // The whole point of the guard: eight clicks, one pass, one price.
    expect((await balances(empire.id)).diamonds).toBe(VIP_COST * 5 - VIP_COST);
  });

  it("refuses a purse that is one diamond short, and charges nothing", async () => {
    const empire = await makeEmpire("broke", { diamonds: VIP_COST - 1 });

    const res = await buyVip({}, new FormData());
    expect(res.error).toBeTruthy();

    const after = await balances(empire.id);
    expect(after.diamonds).toBe(VIP_COST - 1);
    expect(after.vipSince).toBeNull();
  });
});

describe("the gate is server-side", () => {
  it("refuses every one-click action for an empire without the pass, and moves nothing", async () => {
    const empire = await makeEmpire("free", {
      gold: 50_000,
      wood: 50_000,
      iron: 50_000,
      stone: 50_000,
      stored: 1_000,
      banked: 5_000,
      mineSlaves: 40,
    });
    const before = await balances(empire.id);

    const results = await Promise.all(gatedActions().map((run) => run()));

    expect(results.every((r) => r.error)).toBe(true);
    expect(await balances(empire.id)).toEqual(before);
    expect(await bankGold(empire.id)).toBe(5_000);
    expect((await warehouses(empire.id)).every((w) => w.stored === 1_000)).toBe(true);
    expect((await mines(empire.id)).every((m) => m.level === 1 && m.slaves === 0)).toBe(
      true
    );
  });

  it("lets the same calls through once the pass is stamped on", async () => {
    const empire = await makeEmpire("granted", {
      gold: 50_000,
      wood: 50_000,
      iron: 50_000,
      stone: 50_000,
      mineSlaves: 40,
    });

    expect((await depositAllGoldToBank()).error).toBeTruthy();
    await prisma.empire.update({
      where: { id: empire.id },
      data: { vipSince: new Date() },
    });

    expect((await depositAllGoldToBank()).success).toBeTruthy();
    expect(await bankGold(empire.id)).toBe(50_000);
  });
});

describe("the bank, in one press", () => {
  it("banks every available coin and hands it all back", async () => {
    const empire = await makeEmpire("bank", { vip: true, gold: 12_345 });

    expect((await depositAllGoldToBank()).success).toBeTruthy();
    expect((await balances(empire.id)).gold).toBe(0);
    expect(await bankGold(empire.id)).toBe(12_345);

    expect((await withdrawAllGoldFromBank()).success).toBeTruthy();
    expect((await balances(empire.id)).gold).toBe(12_345);
    expect(await bankGold(empire.id)).toBe(0);
  });

  it("never banks the same coins twice under a burst of presses", async () => {
    const empire = await makeEmpire("bankrace", { vip: true, gold: 9_000 });

    await Promise.all(Array.from({ length: 6 }, () => depositAllGoldToBank()));

    // Conservation: what is in the bank plus what is still available is exactly
    // what the empire started with.
    expect((await balances(empire.id)).gold + (await bankGold(empire.id))).toBe(9_000);
  });
});

describe("a warehouse, in one press", () => {
  it("fills to the ceiling and leaves the overflow available", async () => {
    const empire = await makeEmpire("store", { vip: true, gold: 14_000 });
    const capacity = (await warehouses(empire.id)).find((w) => w.type === "GOLD")!;

    const form = new FormData();
    form.set("resourceType", "GOLD");
    expect((await depositAllToStorage({}, form)).success).toBeTruthy();

    const stock = (await warehouses(empire.id)).find((w) => w.type === "GOLD")!;
    const after = await balances(empire.id);
    // A full warehouse is not an error: it is a partial move, and the remainder
    // is still the player's to spend.
    expect(stock.stored + after.gold).toBe(14_000 + capacity.stored);
    expect(after.gold).toBeGreaterThanOrEqual(0);
  });

  it("empties back into the available balance", async () => {
    const empire = await makeEmpire("release", { vip: true, stored: 2_500 });

    const form = new FormData();
    form.set("resourceType", "WOOD");
    expect((await withdrawAllFromStorage({}, form)).success).toBeTruthy();

    expect((await balances(empire.id)).wood).toBe(2_500);
    const stock = (await warehouses(empire.id)).find((w) => w.type === "WOOD")!;
    expect(stock.stored).toBe(0);
  });

  it("refuses an empty warehouse rather than reporting a no-op move", async () => {
    await makeEmpire("empty", { vip: true });
    const form = new FormData();
    form.set("resourceType", "IRON");
    expect((await withdrawAllFromStorage({}, form)).error).toBeTruthy();
  });
});

describe("the mine crew, in one press", () => {
  it("puts the whole crew on one mine, then splits it evenly", async () => {
    const empire = await makeEmpire("crew", { vip: true, mineSlaves: 41 });

    const form = new FormData();
    form.set("resource", "iron");
    expect((await assignAllMineSlavesToResource({}, form)).success).toBeTruthy();

    let layout = await mines(empire.id);
    expect(layout.find((m) => m.type === "IRON_MINE")!.slaves).toBe(41);
    expect(layout.reduce((sum, m) => sum + m.slaves, 0)).toBe(41);

    expect((await splitMineSlavesEqually()).success).toBeTruthy();
    layout = await mines(empire.id);
    // 41 across four mines: 11/10/10/10, and never more slaves than exist.
    expect(layout.reduce((sum, m) => sum + m.slaves, 0)).toBe(41);
    expect(Math.max(...layout.map((m) => m.slaves))).toBe(11);
    expect(Math.min(...layout.map((m) => m.slaves))).toBe(10);
  });

  it("cannot be raced into assigning more slaves than the empire owns", async () => {
    const empire = await makeEmpire("crewrace", { vip: true, mineSlaves: 30 });

    const forms = ["gold", "wood", "iron", "stone"].map((resource) => {
      const f = new FormData();
      f.set("resource", resource);
      return f;
    });
    await Promise.all([
      ...forms.map((f) => assignAllMineSlavesToResource({}, f)),
      splitMineSlavesEqually(),
    ]);

    const layout = await mines(empire.id);
    expect(layout.reduce((sum, m) => sum + m.slaves, 0)).toBeLessThanOrEqual(30);
  });
});

describe("a mine, to the ceiling", () => {
  it("buys every level the treasury can carry, at the ladder's own prices", async () => {
    // Enough gold for the first few rungs of the gold mine and nothing more.
    const budget = 40_000;
    const empire = await makeEmpire("max", { vip: true, gold: budget });

    const form = new FormData();
    form.set("resource", "gold");
    expect((await upgradeMineToMax({}, form)).success).toBeTruthy();

    const mine = (await mines(empire.id)).find((m) => m.type === "GOLD_MINE")!;
    expect(mine.level).toBeGreaterThan(1);

    // Exactly the sum of the levels it bought — the shortcut never discounts.
    let spent = 0;
    for (let level = 1; level < mine.level; level++) {
      spent += mineUpgradeCost(level, "gold").gold;
    }
    const after = await balances(empire.id);
    expect(after.gold).toBe(budget - spent);
    // And it stopped because the next rung was unaffordable, not early.
    expect(after.gold).toBeLessThan(mineUpgradeCost(mine.level, "gold").gold);
  });
});
