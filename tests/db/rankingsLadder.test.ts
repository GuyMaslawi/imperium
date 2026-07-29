import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getCityLadderPage, PAGE_SIZE } from "@/server/rankingsLadder";

/**
 * The live city ladder.
 *
 * The ladder has no cache any more: every read is bounded SQL, and the rank a
 * player sees is a `COUNT(*) FILTER (…)` over their tier while the rows they see
 * come from a separate `ORDER BY … LIMIT` query. That split is the whole risk —
 * two hand-written SQL expressions that must encode *exactly* the same total
 * order, or a player is told "rank 5" while sitting sixth on the page.
 *
 * So the assertion that matters most here is the agreement one: for every empire
 * in a tier, the rank the count reports equals its position in the pages. It runs
 * against Postgres because that is the only thing that can answer what the two
 * expressions actually do — NULL heroes, float ties, collation of the `id`
 * tiebreak.
 *
 * Fixtures live in tiers no real empire occupies (`Empire.cities` far above
 * MAX_CITIES), so the bucket under test holds only this file's rows and the
 * assertions do not depend on the state of a development database.
 */

const prisma = new PrismaClient();
const TAG = `ld${Date.now().toString(36)}`;

/** Tiers this file writes into — well past MAX_CITIES, so nothing real is here. */
const SOLO_TIER = 91;
const TIE_TIER = 92;
const PAGED_TIER = 93;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  await prisma.$disconnect();
});

/** Just enough of a created empire to ask the ladder about it. */
interface Fixture {
  id: string;
}

async function makeEmpire(
  label: string,
  tier: number,
  power: number,
  hero: { level: number; resets: number } | null = { level: 1, resets: 0 },
  soldiers = 0
): Promise<Fixture> {
  const user = await prisma.user.create({
    data: {
      email: `${label}@${TAG}.test`,
      name: `שחקן ${label}`,
      passwordHash: "x",
      emailVerified: new Date(),
    },
  });
  const empire = await prisma.empire.create({
    data: {
      userId: user.id,
      name: `${TAG}-${label}`,
      gold: 0,
      turns: 0,
      citizens: 0,
      cities: tier,
      // Written straight in: the ladder ranks off this denormalised column, and
      // what keeps it true is tests/db/empirePower.test.ts, not this file.
      militaryPower: power,
    },
  });
  await prisma.army.create({ data: { empireId: empire.id, soldiers } });
  if (hero) {
    await prisma.hero.create({
      data: { empireId: empire.id, level: hero.level, resets: hero.resets },
    });
  }
  return { id: empire.id };
}

/** Ask the ladder for one empire's own view of its tier. */
async function pageFor(tier: number, e: Fixture, requestedPage = NaN) {
  return getCityLadderPage(tier, e.id, requestedPage);
}

describe("getCityLadderPage", () => {
  it("ranks a tier by power, and reports each empire's own exact rank", async () => {
    const strong = await makeEmpire("strong", SOLO_TIER, 5_000, null, 300);
    const middle = await makeEmpire("middle", SOLO_TIER, 3_000, null, 200);
    const weak = await makeEmpire("weak", SOLO_TIER, 1_000, null, 100);

    const seen = await pageFor(SOLO_TIER, middle);

    expect(seen.total).toBe(3);
    expect(seen.pageCount).toBe(1);
    expect(seen.firstRank).toBe(1);
    expect(seen.rows.map((r) => r.id)).toEqual([strong.id, middle.id, weak.id]);
    expect(seen.myRank).toBe(2);

    // The row carries what the table draws, for a heroless empire too.
    expect(seen.rows[1].army).toEqual({ soldiers: 200 });
    expect(seen.rows[1].power).toBe(3_000);
    expect(seen.rows[1].hero).toBeNull();

    // Every empire's reported rank is its position in the rows — the count query
    // and the row query agreeing, which is the invariant the split risks.
    for (const [index, row] of seen.rows.entries()) {
      const mine = await pageFor(SOLO_TIER, row);
      expect(mine.myRank).toBe(index + 1);
    }
  });

  it("breaks ties on hero level, then resets, then stably on id", async () => {
    // All five sit on identical power: the tie-break chain is the only thing
    // ordering them.
    const P = 7_777;
    const hiLevel = await makeEmpire("tie-hi-level", TIE_TIER, P, { level: 30, resets: 0 });
    const reset = await makeEmpire("tie-reset", TIE_TIER, P, { level: 5, resets: 3 });
    const plainA = await makeEmpire("tie-plain-a", TIE_TIER, P, { level: 5, resets: 0 });
    const plainB = await makeEmpire("tie-plain-b", TIE_TIER, P, { level: 5, resets: 0 });
    const heroless = await makeEmpire("tie-heroless", TIE_TIER, P, null);

    const seen = await pageFor(TIE_TIER, hiLevel);

    const [first, second, ...rest] = seen.rows.map((r) => r.id);
    expect(first).toBe(hiLevel.id);
    expect(second).toBe(reset.id);
    // The two level-5, zero-reset empires tie on every game term and fall
    // through to `id` — arbitrary, but *stable*, which is the reason that last
    // tiebreak exists at all.
    expect(rest.slice(0, 2)).toEqual([plainA.id, plainB.id].sort());
    // The heroless one counts as level 1, reset 0 — last, not first (a plain
    // `ORDER BY level DESC` would sort its NULL to the top).
    expect(rest.at(-1)).toBe(heroless.id);

    // Same agreement check, now where every row ties on power: an empire told it
    // is 4th must be the 4th row, or the medals sit on the wrong players.
    for (const [index, row] of seen.rows.entries()) {
      const mine = await pageFor(TIE_TIER, row);
      expect(mine.myRank).toBe(index + 1);
    }
  });

  it("serves the page holding the viewer, and clamps what is asked for", async () => {
    // Twelve empires, strongest first — two pages at PAGE_SIZE 10.
    const all: Fixture[] = [];
    for (let i = 0; i < PAGE_SIZE + 2; i++) {
      all.push(await makeEmpire(`p${i}`, PAGED_TIER, 100_000 - i * 1_000));
    }
    const eleventh = all[10];

    // No page asked for: you land on your own.
    const mine = await pageFor(PAGED_TIER, eleventh);
    expect(mine.total).toBe(PAGE_SIZE + 2);
    expect(mine.pageCount).toBe(2);
    expect(mine.myRank).toBe(11);
    expect(mine.myPage).toBe(2);
    expect(mine.page).toBe(2);
    expect(mine.firstRank).toBe(11);
    expect(mine.rows.map((r) => r.id)).toEqual([all[10].id, all[11].id]);

    // Page 1 is the top ten, and rank numbering starts at 1 there.
    const top = await pageFor(PAGED_TIER, eleventh, 1);
    expect(top.page).toBe(1);
    expect(top.firstRank).toBe(1);
    expect(top.rows).toHaveLength(PAGE_SIZE);
    expect(top.rows[0].id).toBe(all[0].id);
    // Your own page is still reported while you read someone else's.
    expect(top.myPage).toBe(2);

    // Out-of-range requests are clamped rather than serving an empty table.
    expect((await pageFor(PAGED_TIER, eleventh, 99)).page).toBe(2);
    expect((await pageFor(PAGED_TIER, eleventh, -5)).page).toBe(1);
  });

  it("reads an empty tier without pretending it has a page of rows", async () => {
    const empty = await getCityLadderPage(99, "nobody", NaN);

    expect(empty.total).toBe(0);
    expect(empty.rows).toEqual([]);
    expect(empty.pageCount).toBe(1);
    expect(empty.page).toBe(1);
  });
});
