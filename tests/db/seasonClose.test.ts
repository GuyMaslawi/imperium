import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { archiveSeasonStandings, closeSeason } from "@/server/seasonClose";

/**
 * Sealing a season.
 *
 * Every invariant here is a property of Postgres, which is why this suite is
 * database-backed rather than mocked:
 *
 *  • The close runs *lazily*, on whichever request first observes the deadline.
 *    A hundred players refreshing at 20:00:00 all reach it at once, and only one
 *    of them may write the archive. The mutex is a guarded
 *    `updateMany(closedAt: null)` — a read-then-write check would pass for all
 *    hundred, so the thing under test is the WHERE clause.
 *  • The archive must outlive both the empires it names and the season row it
 *    came from. Nothing in `SeasonChampion` is a relation, and the test that
 *    matters is that deleting the GameSeason leaves the hall standing — which
 *    only a real foreign-key-less schema can answer.
 *  • Archiving twice (admin saves before a reset, clock closes the season
 *    later) must not rewrite published history. That is `skipDuplicates`
 *    against a unique index, again a database behaviour.
 */

const prisma = new PrismaClient();
const TAG = `sc${Date.now().toString(36)}`;

let seasonId = "";
/**
 * Every season this file created. Cleanup goes by *season*, not by empire name:
 * the podium is global, so a run on a database that already holds empires will
 * archive some of those too, and deleting only the rows this file named would
 * leave real empires enshrined in the developer's hall of fame.
 */
const createdSeasons: string[] = [];

afterAll(async () => {
  await prisma.seasonChampion.deleteMany({ where: { seasonId: { in: createdSeasons } } });
  await prisma.gameSeason.deleteMany({ where: { id: { in: createdSeasons } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  await prisma.$disconnect();
});

/**
 * An empire with an explicit military power.
 *
 * The podium is global — it ranks every empire in the game — so the figures
 * here are deliberately astronomical: they have to out-rank whatever fixture
 * data the development database happens to be carrying, or the assertions would
 * depend on the state of someone's local seed.
 */
async function makeEmpire(label: string, power: number, heroLevel = 1) {
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
      cities: 3,
      militaryPower: power,
    },
  });
  await prisma.hero.create({ data: { empireId: empire.id, level: heroLevel } });
  return empire;
}

async function makeSeason(label: string) {
  const season = await prisma.gameSeason.create({
    data: {
      name: `${TAG}-${label}`,
      startsAt: new Date(Date.now() - 86_400_000),
      endsAt: new Date(Date.now() - 1000),
    },
  });
  createdSeasons.push(season.id);
  return season.id;
}

async function championsOf(id: string) {
  return prisma.seasonChampion.findMany({
    where: { seasonId: id },
    orderBy: { rank: "asc" },
  });
}

/**
 * Fill the podium with this test's own empires.
 *
 * Every test seats at least three, because the podium is global: seat fewer and
 * whatever the development database already holds takes the empty steps, and
 * the assertions would depend on someone's local seed. `top` is the strongest.
 */
async function seatPodium(top: string, ...rest: string[]) {
  const labels = [top, ...rest];
  while (labels.length < 3) labels.push(`filler${labels.length}`);
  const empires = [];
  for (const [i, label] of labels.entries()) {
    empires.push(await makeEmpire(label, 9_000_000_000_000 - i * 100_000_000_000));
  }
  return empires;
}

/**
 * The podium is game-wide, so each test needs the world to itself: an empire
 * left behind by the previous test would sit on the next test's podium. Users
 * are the root — empires and heroes cascade off them.
 */
beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  seasonId = await makeSeason(`s${Math.random().toString(36).slice(2, 7)}`);
});

describe("closeSeason", () => {
  it("archives the top three, ranked by military power", async () => {
    await makeEmpire("gold", 9_000_000_000_000);
    await makeEmpire("silver", 8_000_000_000_000);
    await makeEmpire("bronze", 7_000_000_000_000);
    await makeEmpire("fourth", 6_000_000_000_000);

    expect(await closeSeason(seasonId)).toBe(true);

    const champs = await championsOf(seasonId);
    expect(champs.map((c) => c.rank)).toEqual([1, 2, 3]);
    expect(champs.map((c) => c.empireName)).toEqual([
      `${TAG}-gold`,
      `${TAG}-silver`,
      `${TAG}-bronze`,
    ]);
    // The season's own identity is copied onto every row, so the hall can be
    // read without the season.
    expect(champs[0].seasonName).toBe((await prisma.gameSeason.findUnique({
      where: { id: seasonId },
      select: { name: true },
    }))!.name);
    expect(champs[0].playerName).toBe("שחקן gold");
  });

  it("breaks a power tie on the hero, like the ladder does", async () => {
    const tie = 9_500_000_000_000;
    await makeEmpire("lowhero", tie, 4);
    await makeEmpire("highhero", tie, 40);
    await makeEmpire("third", tie - 1_000_000_000);

    await closeSeason(seasonId);

    const champs = await championsOf(seasonId);
    expect(champs[0].empireName).toBe(`${TAG}-highhero`);
    expect(champs[0].heroLevel).toBe(40);
  });

  it("closes exactly once under a simultaneous burst", async () => {
    await seatPodium("a", "b", "c");

    // Twelve page loads crossing the deadline in the same instant.
    const results = await Promise.all(
      Array.from({ length: 12 }, () => closeSeason(seasonId))
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await championsOf(seasonId)).toHaveLength(3);

    const season = await prisma.gameSeason.findUnique({ where: { id: seasonId } });
    expect(season?.closedAt).toBeInstanceOf(Date);
    expect(season?.recap).toBeTruthy();
  });

  it("is a no-op on an already-closed season", async () => {
    await seatPodium("solo");

    expect(await closeSeason(seasonId)).toBe(true);
    const first = await prisma.gameSeason.findUnique({ where: { id: seasonId } });

    expect(await closeSeason(seasonId)).toBe(false);
    const second = await prisma.gameSeason.findUnique({ where: { id: seasonId } });

    // Not even the timestamp moves — a second close must not re-date history.
    expect(second?.closedAt?.getTime()).toBe(first?.closedAt?.getTime());
    expect(await championsOf(seasonId)).toHaveLength(3);
  });
});

describe("archiveSeasonStandings", () => {
  it("records the podium without ending the season", async () => {
    await seatPodium("keep");

    expect(await archiveSeasonStandings(seasonId)).toBe(3);
    expect((await championsOf(seasonId))[0].empireName).toBe(`${TAG}-keep`);

    // The admin saved a record; the game must still be open.
    const season = await prisma.gameSeason.findUnique({ where: { id: seasonId } });
    expect(season?.closedAt).toBeNull();
  });

  it("does not let a later close rewrite what was already published", async () => {
    const [winner] = await seatPodium("early");
    await archiveSeasonStandings(seasonId);

    // The world is wiped and rebuilt, and someone new tops the ladder.
    await prisma.empire.update({
      where: { id: winner.id },
      data: { militaryPower: 1 },
    });
    await makeEmpire("late", 9_900_000_000_000);

    await closeSeason(seasonId);

    const champs = await championsOf(seasonId);
    expect(champs[0].empireName).toBe(`${TAG}-early`);
    expect(champs.map((c) => c.empireName)).not.toContain(`${TAG}-late`);
  });
});

describe("the archive outlives its sources", () => {
  it("survives deleting the season row it came from", async () => {
    await seatPodium("ghost");
    await closeSeason(seasonId);

    await prisma.gameSeason.delete({ where: { id: seasonId } });

    const champs = await championsOf(seasonId);
    expect(champs).toHaveLength(3);
    // Everything the board draws is on the row itself, not behind a join.
    expect(champs[0].seasonName).toContain(TAG);
    expect(champs[0].seasonEndsAt).toBeInstanceOf(Date);
  });
});
