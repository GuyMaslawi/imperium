import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ADMIN_INT_MAX, saturatingIncrement } from "@/lib/admin";

/**
 * The int4 ceiling on the admin editor.
 *
 * `Empire.turns` / `citizens` / `wheelSpins` are `Int`, i.e. Postgres int4. A
 * value past 2,147,483,647 is *rejected by the driver* rather than truncated —
 * the admin who typed 1e12 into the total-player editor got the generic
 * "אירעה שגיאה" and nothing saved. That is a property of Postgres, not of our
 * TypeScript, so it is asserted here rather than mocked.
 *
 * The gift path has the same trap one level deeper: it adds with `increment`,
 * which Postgres evaluates, so a *sum* past int4 fails the whole transaction —
 * every other recipient in the batch included. `saturatingIncrement` is what
 * keeps one maxed-out empire from poisoning a server-wide gift.
 */

const prisma = new PrismaClient();
const TAG = `il${Date.now().toString(36)}`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  await prisma.$disconnect();
});

async function makeEmpire(label: string, turns: number): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: `${label}@${TAG}.test`,
      name: `שחקן ${label}`,
      passwordHash: "x",
      emailVerified: new Date(),
    },
  });
  const empire = await prisma.empire.create({
    data: { userId: user.id, name: `${TAG}-${label}`, turns },
  });
  return empire.id;
}

const turnsOf = async (id: string) =>
  (await prisma.empire.findUniqueOrThrow({ where: { id }, select: { turns: true } })).turns;

describe("int4 limits on the admin editor", () => {
  it("rejects a value past int4 outright — this is why ADMIN_INT_MAX exists", async () => {
    const id = await makeEmpire("overflow", 0);
    await expect(
      prisma.empire.update({ where: { id }, data: { turns: 1_000_000_000_000 } })
    ).rejects.toThrow();
    // The failed statement left the row untouched, which is exactly what the
    // admin saw: an error message and no change.
    expect(await turnsOf(id)).toBe(0);
  });

  it("accepts ADMIN_INT_MAX, and leaves the game room to keep incrementing", async () => {
    const id = await makeEmpire("ceiling", 0);
    await prisma.empire.update({ where: { id }, data: { turns: ADMIN_INT_MAX } });
    expect(await turnsOf(id)).toBe(ADMIN_INT_MAX);

    // The headroom that matters: applyPendingUpdates increments `turns` on
    // every regular update, so a ceiling of exactly int4's max would brick the
    // empire on its owner's next page load.
    await prisma.empire.update({ where: { id }, data: { turns: { increment: 5 } } });
    expect(await turnsOf(id)).toBe(ADMIN_INT_MAX + 5);
  });
});

describe("saturatingIncrement", () => {
  it("gives the full amount to whoever has headroom and pins the rest", async () => {
    const roomy = await makeEmpire("roomy", 1_000);
    const nearCap = await makeEmpire("nearcap", ADMIN_INT_MAX - 5);
    const overCap = await makeEmpire("overcap", ADMIN_INT_MAX + 100);

    await prisma.$transaction(async (tx) => {
      await saturatingIncrement(tx, [roomy, nearCap, overCap], "turns", 50_000);
    });

    expect(await turnsOf(roomy)).toBe(51_000);
    expect(await turnsOf(nearCap)).toBe(ADMIN_INT_MAX);
    // Already above the ceiling: a gift must never subtract.
    expect(await turnsOf(overCap)).toBe(ADMIN_INT_MAX + 100);
  });

  it("survives a gift that would overflow int4 on a maxed-out recipient", async () => {
    const maxed = await makeEmpire("maxed", ADMIN_INT_MAX);
    const other = await makeEmpire("other", 0);

    // ADMIN_INT_MAX + ADMIN_INT_MAX is under int4's max only because the
    // ceiling leaves room; the same call with a plain `increment` on a row
    // sitting at 2^31-1 is what would abort the whole transaction.
    await prisma.$transaction(async (tx) => {
      await saturatingIncrement(tx, [maxed, other], "turns", ADMIN_INT_MAX);
    });

    expect(await turnsOf(maxed)).toBe(ADMIN_INT_MAX);
    expect(await turnsOf(other)).toBe(ADMIN_INT_MAX);
  });
});
