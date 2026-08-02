import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { applyPendingUpdates } from "@/lib/game/updates";
import { heroPointPool, heroPointsHeld } from "@/lib/game/hero";

/**
 * The hero point pool as an invariant (2026-08-01).
 *
 * A hero is owed one point per level he stands at plus 25 per reset behind him,
 * and `applyPendingUpdates` tops up any row holding less than that on every page
 * load. That repair is a *faucet*: each point is a permanent +1% on a core
 * combat stat, so paying one twice is a permanent, un-undoable buff — and the
 * repair runs on the hottest path in the game, from as many tabs as a player
 * cares to open.
 *
 * What can only be tested against a real database is that the guard holds under
 * concurrency: the top-up is an `updateMany` pinned to the exact snapshot that
 * produced the figure, so of N parallel loads exactly one may pay.
 */

const prisma = new PrismaClient();
const TAG = `hp${Date.now().toString(36)}`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  await prisma.$disconnect();
});

/** An empire whose hero is deliberately short of the pool he is owed. */
async function shortedHero(
  name: string,
  hero: { level: number; resets: number; unspentPoints: number }
) {
  const user = await prisma.user.create({
    data: {
      email: `${name}@${TAG}.test`,
      name,
      passwordHash: "x",
      emailVerified: new Date(),
    },
  });
  const empire = await prisma.empire.create({
    data: {
      userId: user.id,
      name: `${TAG}-${name}`,
      citizens: 0,
      // No backlog to settle: this test is about the point repair, not the
      // production clock.
      lastRegularUpdateAt: new Date(),
      lastDailyUpdateAt: new Date(),
    },
  });
  await prisma.hero.create({
    data: {
      empireId: empire.id,
      level: hero.level,
      resets: hero.resets,
      unspentPoints: hero.unspentPoints,
      attackPoints: 0,
      defensePoints: 0,
      resourcePoints: 0,
    },
  });
  return empire.id;
}

const held = async (empireId: string) =>
  heroPointsHeld(await prisma.hero.findUniqueOrThrow({ where: { empireId } }));

describe("the hero point pool", () => {
  it("repays a hero shorted by an absolute edit", async () => {
    // The row that prompted the rule: a level-16 hero holding 9 points, left
    // behind by an admin edit that raised the level without the point columns.
    const empireId = await shortedHero("short", {
      level: 16,
      resets: 0,
      unspentPoints: 9,
    });
    await applyPendingUpdates(empireId);
    expect(await held(empireId)).toBe(heroPointPool(16, 0));
  });

  it("pays a concurrent burst of page loads exactly once", async () => {
    const empireId = await shortedHero("burst", {
      level: 40,
      resets: 2,
      unspentPoints: 0,
    });
    // Twenty tabs waking at once. Each reads the same shortfall and each tries
    // to pay it; the guard pins the snapshot, so nineteen must match zero rows.
    await Promise.all(
      Array.from({ length: 20 }, () => applyPendingUpdates(empireId))
    );
    expect(await held(empireId)).toBe(heroPointPool(40, 2));
  });

  it("never pays twice when loads are merely repeated", async () => {
    const empireId = await shortedHero("repeat", {
      level: 7,
      resets: 1,
      unspentPoints: 0,
    });
    await applyPendingUpdates(empireId);
    await applyPendingUpdates(empireId);
    await applyPendingUpdates(empireId);
    expect(await held(empireId)).toBe(heroPointPool(7, 1));
  });

  it("leaves a hero holding more than the pool alone", async () => {
    // Taking points back would silently weaken an empire that was granted them,
    // so the repair is deliberately one-directional.
    const empireId = await shortedHero("rich", {
      level: 3,
      resets: 0,
      unspentPoints: 99,
    });
    await applyPendingUpdates(empireId);
    expect(await held(empireId)).toBe(99);
  });

  it("caps the pool at the level ceiling", async () => {
    const empireId = await shortedHero("capped", {
      level: 100,
      resets: 0,
      unspentPoints: 0,
    });
    await applyPendingUpdates(empireId);
    expect(await held(empireId)).toBe(100);
  });
});
