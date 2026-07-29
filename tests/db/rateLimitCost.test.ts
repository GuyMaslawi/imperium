import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { rateLimit } from "@/lib/rateLimit";

/**
 * The cost-weighted budget, which is what bounds player mail by *addressee*
 * rather than by call.
 *
 * It is tested here rather than in the pure suite because the arithmetic that
 * matters happens inside the `ON CONFLICT DO UPDATE`: the decision is made from
 * the count Postgres stored, not from anything this process computed. A fake
 * would only assert that the fake adds up.
 */

const prisma = new PrismaClient();
const TAG = `rlc${Date.now().toString(36)}`;
const MINUTE = 60_000;

afterAll(async () => {
  await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: TAG } } });
  await prisma.$disconnect();
});

const stored = (key: string) =>
  prisma.rateLimitBucket
    .findUnique({ where: { key } })
    .then((row) => row?.count ?? 0);

describe("rateLimit cost", () => {
  it("charges the cost, not the call", async () => {
    const key = `${TAG}:charge`;
    // Limit 10, three units a time: two go through (6), the third would be 9
    // — still fine — and the fourth would be 12, which is over.
    expect(await rateLimit(key, 10, MINUTE, 3)).toBe(true);
    expect(await rateLimit(key, 10, MINUTE, 3)).toBe(true);
    expect(await rateLimit(key, 10, MINUTE, 3)).toBe(true);
    expect(await stored(key)).toBe(9);
    expect(await rateLimit(key, 10, MINUTE, 3)).toBe(false);

    // A single unit still fits in the one remaining slot — the budget is
    // counted, not merely tripped.
    expect(await rateLimit(key, 10, MINUTE)).toBe(true);
    expect(await stored(key)).toBe(10);
    expect(await rateLimit(key, 10, MINUTE)).toBe(false);
  });

  it("refuses a single charge larger than the whole window", async () => {
    const key = `${TAG}:oversize`;
    expect(await rateLimit(key, 5, MINUTE, 6)).toBe(false);
  });

  it("never lets a non-positive cost refund the window", async () => {
    const key = `${TAG}:refund`;
    expect(await rateLimit(key, 2, MINUTE)).toBe(true);
    // Clamped to 1. If it decremented instead, the next call would pass.
    expect(await rateLimit(key, 2, MINUTE, -100)).toBe(true);
    expect(await stored(key)).toBe(2);
    expect(await rateLimit(key, 2, MINUTE)).toBe(false);
    expect(await stored(key)).toBe(2);
  });

  it("cannot be raced past its limit", async () => {
    const key = `${TAG}:race`;
    // Twelve simultaneous 3-unit charges against a budget of 9: three may pass.
    const verdicts = await Promise.all(
      Array.from({ length: 12 }, () => rateLimit(key, 9, MINUTE, 3))
    );
    expect(verdicts.filter(Boolean)).toHaveLength(3);
    expect(await stored(key)).toBe(9);
  });

  it("keeps each sender→recipient pair on its own budget", async () => {
    // The shape the anti-harassment cap relies on: burning one pair's budget
    // must leave every other pair untouched.
    const hammered = `${TAG}:pair:a:victim`;
    const bystander = `${TAG}:pair:a:other`;
    for (let i = 0; i < 5; i++) {
      expect(await rateLimit(hammered, 5, MINUTE)).toBe(true);
    }
    expect(await rateLimit(hammered, 5, MINUTE)).toBe(false);
    expect(await rateLimit(bystander, 5, MINUTE)).toBe(true);
  });
});
