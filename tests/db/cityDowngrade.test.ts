import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  CITY_DOWNGRADE_COST,
  CITY_DOWNGRADE_MIN_CITIES,
} from "@/lib/game/diamondShop";

/**
 * The city-downgrade spell (2026-08-02) — the only purchase in the shop that
 * makes the empire *smaller*, which is exactly why its guards are worth a
 * database.
 *
 * `Empire.cities` is the game's top-line multiplier (mine output, population
 * ceiling, boss tier, PvP bracket), and the way back up costs `cityCost` —
 * 1M × 2.5^(tier−1) — so a cast that dropped two tiers instead of one is not a
 * cosmetic bug, it is billions of gold the player has to earn back. Three things
 * are asserted here and cannot be asserted anywhere else:
 *
 * 1. The floor holds: an empire on its last city is refused and pays nothing.
 * 2. One cast moves exactly one tier and charges exactly once.
 * 3. N parallel casts move exactly one tier between them — the decrement is an
 *    `updateMany` pinned to the snapshot tier, so the losers of the race match
 *    zero rows and roll their diamond spend back with them.
 *
 * The session is the only thing stubbed; the transaction, the row lock and the
 * guards underneath it are real.
 */

let currentEmpireId: string | null = null;

vi.mock("@/lib/auth", () => ({
  getActiveEmpireId: async () => currentEmpireId,
}));

// The action ends by revalidating /game, which needs a request context Next only
// builds while serving one. Left real it throws *after* a successful commit, and
// the action's catch would report a failure the database does not agree with.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { castCityDowngradeSpell } = await import("@/server/actions/diamondShop");

const prisma = new PrismaClient();
const TAG = `cd${Date.now().toString(36)}`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  await prisma.$disconnect();
});

/** An empire parked at a given tier with a full purse and no backlog to settle. */
async function empireAt(label: string, cities: number, diamonds: number) {
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
      cities,
      diamonds,
      citizens: 0,
      // The lazy clock is not what is under test: start it settled so a
      // production tick can't move the columns these assertions read.
      lastRegularUpdateAt: new Date(),
      lastDailyUpdateAt: new Date(),
    },
  });
  await prisma.hero.create({ data: { empireId: empire.id } });
  return empire;
}

function state(id: string) {
  return prisma.empire.findUniqueOrThrow({
    where: { id },
    select: { cities: true, diamonds: true },
  });
}

describe("city downgrade spell", () => {
  it("refuses the last city and charges nothing", async () => {
    const empire = await empireAt("floor", 1, 5_000);
    currentEmpireId = empire.id;

    const res = await castCityDowngradeSpell({}, new FormData());
    expect(res.error).toBeTruthy();
    expect(res.success).toBeUndefined();

    // Still a one-city empire with a full purse: the floor is checked before
    // anything is spent.
    expect(await state(empire.id)).toEqual({ cities: 1, diamonds: 5_000 });
  });

  it("drops exactly one tier for exactly one price", async () => {
    const empire = await empireAt("one", 5, 5_000);
    currentEmpireId = empire.id;

    const res = await castCityDowngradeSpell({}, new FormData());
    expect(res.success).toBeTruthy();

    expect(await state(empire.id)).toEqual({
      cities: 4,
      diamonds: 5_000 - CITY_DOWNGRADE_COST,
    });
  });

  it("holds the hour cooldown against a second cast", async () => {
    const empire = await empireAt("cooldown", 5, 5_000);
    currentEmpireId = empire.id;

    expect((await castCityDowngradeSpell({}, new FormData())).success).toBeTruthy();
    const after = await state(empire.id);

    const second = await castCityDowngradeSpell({}, new FormData());
    expect(second.error).toBeTruthy();
    // Not a diamond moved, not a tier lost: the cooldown is checked before the
    // spend, so a refused cast is free.
    expect(await state(empire.id)).toEqual(after);
  });

  it("loses exactly one tier to a burst of parallel casts", async () => {
    const empire = await empireAt("race", 5, 5_000);
    currentEmpireId = empire.id;

    const results = await Promise.all(
      Array.from({ length: 8 }, () => castCityDowngradeSpell({}, new FormData()))
    );
    const won = results.filter((r) => r.success).length;

    expect(won).toBe(1);
    expect(await state(empire.id)).toEqual({
      cities: 4,
      diamonds: 5_000 - CITY_DOWNGRADE_COST,
    });
  });

  it("cannot be walked below the floor by a burst at the floor tier", async () => {
    const empire = await empireAt("edge", CITY_DOWNGRADE_MIN_CITIES, 5_000);
    currentEmpireId = empire.id;

    const results = await Promise.all(
      Array.from({ length: 8 }, () => castCityDowngradeSpell({}, new FormData()))
    );

    expect(results.filter((r) => r.success).length).toBe(1);
    expect(await state(empire.id)).toEqual({
      cities: CITY_DOWNGRADE_MIN_CITIES - 1,
      diamonds: 5_000 - CITY_DOWNGRADE_COST,
    });
  });
});
