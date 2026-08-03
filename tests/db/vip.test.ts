import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { STORAGE_TYPES, storageCapacityForLevel } from "@/lib/game/constants";
import { VIP_COST } from "@/lib/game/vip";

/**
 * VIP (חותם המלוכה) and the bulk actions it unlocks.
 *
 * Two distinct classes of invariant live here, and neither can be asserted
 * without a database:
 *
 * 1. **The pass is bought once.** `buyVip` reads "not VIP yet", then charges.
 *    Under READ COMMITTED two clicks both pass that read, so what actually
 *    stops the second charge is the `vipSince: null` in the guarded UPDATE's
 *    WHERE — a property of Postgres, not of the TypeScript above it.
 * 2. **The bulk actions are the paywall, server-side.** The buttons are only
 *    rendered for VIP, but rendering is not authorisation: every action
 *    re-checks the pass, and an empire without it must come back untouched.
 *
 * Everything else asserted here is the "convenience, not power" rule in
 * numbers: storing all four warehouses moves exactly what one-at-a-time
 * deposits would have moved, stops at each warehouse's ceiling, and never
 * conjures a resource that was not already in the empire's column.
 */

let currentEmpireId: string | null = null;

vi.mock("@/lib/auth", () => ({
  getActiveEmpireId: async () => currentEmpireId,
}));

// The actions end by revalidating /game, which needs a request context Next
// only builds while serving one. Left real it throws *after* a successful
// commit, and the catch would report a failure the database does not agree with.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const {
  buyVip,
  storeAllResources,
  releaseAllResources,
  upgradeAllStorages,
  trainMaxUnits,
} = await import("@/server/actions/vip");

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
  citizens?: number;
  /** Warehouse level, one per resource (level 1 holds 10,000). */
  storageLevel?: number;
  /** Starting stock inside every warehouse. */
  stored?: number;
}

/** An empire with four warehouses and no clock backlog to settle. */
async function makeEmpire(label: string, options: EmpireOptions = {}) {
  const {
    diamonds = 0,
    vip = false,
    gold = 0,
    wood = 0,
    iron = 0,
    stone = 0,
    citizens = 0,
    storageLevel = 1,
    stored = 0,
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
      citizens,
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
      citizens: true,
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
  return rows.map((r) => ({
    type: r.resourceType,
    level: r.level,
    stored: r.storedAmount,
  }));
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

describe("the paywall is server-side", () => {
  it("refuses every bulk action for an empire without the pass", async () => {
    const empire = await makeEmpire("free", {
      gold: 5_000,
      wood: 5_000,
      iron: 5_000,
      stone: 5_000,
      citizens: 100,
      stored: 1_000,
    });
    const before = await balances(empire.id);

    const trainForm = new FormData();
    trainForm.set("unit", "soldiers");
    const results = await Promise.all([
      storeAllResources(),
      releaseAllResources(),
      upgradeAllStorages(),
      trainMaxUnits({}, trainForm),
    ]);

    expect(results.every((r) => r.error)).toBe(true);
    // Not a resource, not a citizen, not a warehouse level moved.
    expect(await balances(empire.id)).toEqual(before);
    expect((await warehouses(empire.id)).every((w) => w.stored === 1_000)).toBe(true);
  });
});

describe("storing and releasing all four warehouses", () => {
  it("moves every available resource in, and stops at each ceiling", async () => {
    const capacity = storageCapacityForLevel(1);
    const empire = await makeEmpire("store", {
      vip: true,
      // Gold overflows its warehouse; the other three fit with room to spare.
      gold: capacity + 4_000,
      wood: 1_500,
      iron: 900,
      stone: 0,
    });

    const res = await storeAllResources();
    expect(res.success).toBeTruthy();

    const after = await balances(empire.id);
    // The overflow stays available — a full warehouse is not an error, it is a
    // partial move, and the remainder is still the player's to spend.
    expect(after.gold).toBe(4_000);
    expect(after.wood).toBe(0);
    expect(after.iron).toBe(0);
    expect(after.stone).toBe(0);

    const stock = Object.fromEntries(
      (await warehouses(empire.id)).map((w) => [w.type, w.stored])
    );
    expect(stock.GOLD).toBe(capacity);
    expect(stock.WOOD).toBe(1_500);
    expect(stock.IRON).toBe(900);
    expect(stock.STONE).toBe(0);
  });

  it("never overdraws under a burst of parallel presses", async () => {
    const empire = await makeEmpire("storerace", {
      vip: true,
      gold: 3_000,
      wood: 3_000,
      iron: 3_000,
      stone: 3_000,
    });

    await Promise.all(Array.from({ length: 6 }, () => storeAllResources()));

    const after = await balances(empire.id);
    const stock = await warehouses(empire.id);
    // Conservation: whatever ended up inside plus whatever is still available
    // is exactly what the empire started with, on every resource.
    expect(after.gold).toBeGreaterThanOrEqual(0);
    for (const w of stock) {
      const key = w.type.toLowerCase() as "gold" | "wood" | "iron" | "stone";
      expect(after[key] + w.stored).toBe(3_000);
    }
  });

  it("empties all four back into the available balances", async () => {
    const empire = await makeEmpire("release", { vip: true, stored: 2_500 });

    const res = await releaseAllResources();
    expect(res.success).toBeTruthy();

    const after = await balances(empire.id);
    expect([after.gold, after.wood, after.iron, after.stone]).toEqual([
      2_500, 2_500, 2_500, 2_500,
    ]);
    expect((await warehouses(empire.id)).every((w) => w.stored === 0)).toBe(true);
  });

  it("refuses an empty set of warehouses rather than reporting a no-op move", async () => {
    await makeEmpire("empty", { vip: true });
    expect((await releaseAllResources()).error).toBeTruthy();
  });
});

describe("upgrading every warehouse", () => {
  it("raises exactly one level per warehouse, and only what is affordable", async () => {
    // Enough for two warehouses at level 1 (1,920 / 1,440 / 1,200 / 1,200),
    // and short of the third.
    const empire = await makeEmpire("upgrade", {
      vip: true,
      gold: 4_200,
      wood: 3_200,
      iron: 2_700,
      stone: 2_700,
    });

    const res = await upgradeAllStorages();
    expect(res.success).toBeTruthy();

    const levels = (await warehouses(empire.id)).map((w) => w.level);
    // Never two levels on one warehouse, and never zero on all of them.
    expect(Math.max(...levels)).toBe(2);
    expect(levels.filter((l) => l === 2).length).toBeGreaterThanOrEqual(1);
    expect(levels.filter((l) => l === 2).length).toBeLessThan(4);

    const after = await balances(empire.id);
    for (const value of [after.gold, after.wood, after.iron, after.stone]) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("refuses outright when nothing is affordable, and spends nothing", async () => {
    const empire = await makeEmpire("poor", { vip: true, gold: 10 });

    expect((await upgradeAllStorages()).error).toBeTruthy();
    expect((await balances(empire.id)).gold).toBe(10);
    expect((await warehouses(empire.id)).every((w) => w.level === 1)).toBe(true);
  });
});

describe("training every free citizen", () => {
  it("converts the whole population and leaves none behind", async () => {
    const empire = await makeEmpire("train", { vip: true, citizens: 417 });

    const form = new FormData();
    form.set("unit", "soldiers");
    expect((await trainMaxUnits({}, form)).success).toBeTruthy();

    expect((await balances(empire.id)).citizens).toBe(0);
    const army = await prisma.army.findUniqueOrThrow({
      where: { empireId: empire.id },
      select: { soldiers: true },
    });
    expect(army.soldiers).toBe(417);
  });

  it("cannot be raced into training more units than there were citizens", async () => {
    const empire = await makeEmpire("trainrace", { vip: true, citizens: 200 });

    const forms = Array.from({ length: 6 }, () => {
      const f = new FormData();
      f.set("unit", "mineSlaves");
      return f;
    });
    await Promise.all(forms.map((f) => trainMaxUnits({}, f)));

    const after = await balances(empire.id);
    const army = await prisma.army.findUniqueOrThrow({
      where: { empireId: empire.id },
      select: { mineSlaves: true },
    });
    expect(after.citizens + army.mineSlaves).toBe(200);
  });

  it("still needs a spy centre for spies", async () => {
    const empire = await makeEmpire("spies", { vip: true, citizens: 50 });

    const form = new FormData();
    form.set("unit", "spies");
    expect((await trainMaxUnits({}, form)).error).toBeTruthy();
    expect((await balances(empire.id)).citizens).toBe(50);
  });
});
