import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  archiveSeasonStandings,
  closeSeason,
  getHallOfFame,
} from "@/server/seasonClose";
import { SEASON_PRIZES } from "@/lib/game/prizes";

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

/**
 * When this file started, for cleaning up the seasons it did *not* create.
 *
 * Sealing a season now books its successor (see `scheduleNextSeason`), so every
 * close here leaves behind a row with an id nothing recorded. Name-matching
 * cannot find them: `nextSeasonName` raises the last run of digits in the name,
 * and the tag above is `Date.now().toString(36)` — digits and all — so the
 * successor of `sc1a5b-s3` is `sc1a6b-s3`, which no longer carries the tag.
 * Left behind, those rows are future-dated unclosed seasons that the gate on a
 * dev machine will eventually *open*, wiping the developer's world on an
 * unrelated page load. So cleanup goes by "created since this file started",
 * which the suite's serial execution makes exact.
 */
const SUITE_START = new Date();

afterAll(async () => {
  await prisma.seasonChampion.deleteMany({ where: { seasonId: { in: createdSeasons } } });
  await prisma.seasonBoardEntry.deleteMany({ where: { seasonId: { in: createdSeasons } } });
  await prisma.gameSeason.deleteMany({ where: { id: { in: createdSeasons } } });
  // …and the successors those closes booked — see SUITE_START.
  await prisma.gameSeason.deleteMany({ where: { createdAt: { gte: SUITE_START } } });
  await prisma.guild.deleteMany({ where: { name: { startsWith: TAG } } });
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
async function makeEmpire(label: string, power: number, heroLevel = 1, spyPower = 0) {
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
      spyPower,
    },
  });
  await prisma.hero.create({ data: { empireId: empire.id, level: heroLevel } });
  return empire;
}

/** A guild holding the given empires — the GUILD board ranks the sum of these. */
async function makeGuild(label: string, empireIds: string[]) {
  return prisma.guild.create({
    data: {
      name: `${TAG}-guild-${label}`,
      members: {
        create: empireIds.map((empireId, i) => ({
          empireId,
          role: i === 0 ? ("LEADER" as const) : ("MEMBER" as const),
        })),
      },
    },
  });
}

async function boardsOf(id: string) {
  return prisma.seasonBoardEntry.findMany({
    where: { seasonId: id },
    orderBy: [{ kind: "asc" }, { rank: "asc" }],
  });
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
  // Memberships cascade off the empires above; the guild rows themselves do not.
  await prisma.guild.deleteMany({ where: { name: { startsWith: TAG } } });
  // And the successor the previous test's close booked. `scheduleNextSeason`
  // stands down whenever *any* future season is already on the books, so a
  // leftover one would silently disable the booking in the next test.
  await prisma.gameSeason.deleteMany({ where: { createdAt: { gte: SUITE_START } } });
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

/**
 * היכל התהילה's three boards.
 *
 * The invariant that matters is the one the hall exists for: **the season being
 * played may not reach it.** That is not a UI detail — it is the difference
 * between a hall of fame and a second live ladder, and it is enforced by a
 * WHERE on `seasonEndsAt`, so it belongs in the database suite.
 */
describe("hall boards", () => {
  it("archives כוח כללי, ריגול and הברית החזקה when the season closes", async () => {
    const strong = await makeEmpire("power", 9_000_000_000_000, 1, 10_000_000);
    const spy = await makeEmpire("spy", 8_000_000_000_000, 1, 90_000_000);
    const third = await makeEmpire("third", 7_000_000_000_000, 1, 1_000_000);
    await makeGuild("big", [strong.id, spy.id]);
    await makeGuild("small", [third.id]);

    expect(await closeSeason(seasonId)).toBe(true);

    const rows = await boardsOf(seasonId);
    const board = (kind: "POWER" | "SPY" | "GUILD") =>
      rows.filter((r) => r.kind === kind);

    // Power ranks by the same column the ladder ranked by all season.
    expect(board("POWER").map((r) => r.name).slice(0, 3)).toEqual([
      `${TAG}-power`,
      `${TAG}-spy`,
      `${TAG}-third`,
    ]);
    expect(board("POWER")[0].value).toBe(9_000_000_000_000);
    expect(board("POWER")[0].playerName).toBe("שחקן power");
    expect(board("POWER")[0].note).toBe("3 ערים");

    // Spying is its own ladder — the strongest army is not the best network.
    expect(board("SPY")[0].name).toBe(`${TAG}-spy`);
    expect(board("SPY")[0].value).toBe(90_000_000);

    // A guild is worth the sum of its members' power, and holds no dossier.
    const guilds = board("GUILD");
    expect(guilds[0].name).toBe(`${TAG}-guild-big`);
    expect(guilds[0].value).toBe(17_000_000_000_000);
    expect(guilds[0].note).toBe("2 חברים");
    expect(guilds[0].empireId).toBeNull();

    // Every row carries the season's identity, like the podium does.
    expect(rows.every((r) => r.seasonId === seasonId)).toBe(true);
  });

  it("serves the newest finished season through getHallOfFame", async () => {
    const winner = await makeEmpire("hall", 9_000_000_000_000, 1, 5_000_000);
    await seatPodium("filler-a", "filler-b");
    await closeSeason(seasonId);

    const hall = await getHallOfFame();
    expect(hall?.seasonId).toBe(seasonId);

    // Both empire boards are there (this test's empires have power and spy
    // power), and the boards come back in a fixed order. GUILD is only present
    // when the database holds a guild, so it is not asserted on.
    const kinds = hall!.boards.map((b) => b.kind);
    expect(kinds).toContain("POWER");
    expect(kinds).toContain("SPY");
    const order = ["POWER", "SPY", "GUILD"];
    expect([...kinds].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(kinds);

    const power = hall?.boards.find((b) => b.kind === "POWER");
    expect(power?.rows[0].name).toBe(`${TAG}-hall`);
    // The empire is still in the game, so its name is a link.
    expect(power?.rows[0].empireId).toBe(winner.id);
  });

  it("drops the profile link once the empire it names is wiped", async () => {
    const doomed = await makeEmpire("wiped", 9_400_000_000_000, 1, 4_000_000);
    await seatPodium("stay-a", "stay-b");
    await closeSeason(seasonId);

    // The next season's reset deletes every empire; the hall must survive it
    // without pointing at a dossier that 404s.
    await prisma.user.delete({ where: { id: doomed.userId } });

    const hall = await getHallOfFame();
    const row = hall?.boards
      .find((b) => b.kind === "POWER")
      ?.rows.find((r) => r.name === `${TAG}-wiped`);
    expect(row).toBeTruthy();
    expect(row?.empireId).toBeNull();
  });

  it("never shows a season that is still being played", async () => {
    // A season with its deadline in the future: the game is open, and the admin
    // archives the standings before a reset. Those rows are written…
    const running = await prisma.gameSeason.create({
      data: {
        name: `${TAG}-running`,
        startsAt: new Date(Date.now() - 86_400_000),
        endsAt: new Date(Date.now() + 86_400_000),
      },
    });
    createdSeasons.push(running.id);
    await makeEmpire("live", 9_800_000_000_000, 1, 99_000_000);
    await seatPodium("live-b", "live-c");

    expect(await archiveSeasonStandings(running.id)).toBe(3);
    expect(await boardsOf(running.id)).not.toHaveLength(0);

    // …and the hall still refuses to read them, because that season has not
    // ended. Whatever it returns, it is not the running one.
    const hall = await getHallOfFame();
    expect(hall?.seasonId).not.toBe(running.id);
  });

  it("does not let a second archiving rewrite a published hall", async () => {
    const [winner] = await seatPodium("first");
    await archiveSeasonStandings(seasonId);

    // The ladder turns over completely before the clock runs out.
    await prisma.empire.update({
      where: { id: winner.id },
      data: { militaryPower: 1 },
    });
    await makeEmpire("latecomer", 9_900_000_000_000);

    await closeSeason(seasonId);

    const power = (await boardsOf(seasonId)).filter((r) => r.kind === "POWER");
    expect(power[0].name).toBe(`${TAG}-first`);
    expect(power.map((r) => r.name)).not.toContain(`${TAG}-latecomer`);
    // One row per rank, not two — the unique index is what settles the race.
    expect(new Set(power.map((r) => r.rank)).size).toBe(power.length);
  });
});

describe("the podium's prizes", () => {
  /** The account's balance, and what the archive says it was paid. */
  async function purse(empireId: string) {
    const empire = await prisma.empire.findUnique({
      where: { id: empireId },
      select: { diamonds: true },
    });
    return empire!.diamonds;
  }

  it("credits every place its diamonds the moment the season is sealed", async () => {
    const [first, second, third] = await seatPodium("champ", "runner", "bronze");
    const before = await purse(first.id);

    await closeSeason(seasonId);

    // The whole point: no admin step, no collect button — the balance moved.
    expect(await purse(first.id)).toBe(before + SEASON_PRIZES[0].diamonds);
    expect(await purse(second.id)).toBe(before + SEASON_PRIZES[1].diamonds);
    expect(await purse(third.id)).toBe(before + SEASON_PRIZES[2].diamonds);

    const champs = await championsOf(seasonId);
    expect(champs.map((c) => c.prizeDiamonds)).toEqual(
      SEASON_PRIZES.map((p) => p.diamonds)
    );
    expect(champs.every((c) => c.prizePaidAt instanceof Date)).toBe(true);

    // And each winner is told, in his own inbox.
    const receipt = await prisma.message.findFirst({
      where: { empireId: first.id, kind: "SYSTEM", href: "/game/prizes" },
    });
    expect(receipt?.title).toContain("מקום 1");
  });

  it("pays exactly once under a simultaneous burst", async () => {
    const [first] = await seatPodium("once", "b", "c");
    const before = await purse(first.id);

    // The same twelve page loads that race for the close race for the purse.
    await Promise.all(Array.from({ length: 12 }, () => closeSeason(seasonId)));

    expect(await purse(first.id)).toBe(before + SEASON_PRIZES[0].diamonds);
  });

  it("pays nothing when the admin only saves the standings", async () => {
    const [first] = await seatPodium("saved", "b", "c");
    const before = await purse(first.id);

    // Recording a podium is not declaring the season over, so no money moves.
    await archiveSeasonStandings(seasonId);

    expect(await purse(first.id)).toBe(before);
    const champs = await championsOf(seasonId);
    expect(champs.every((c) => c.prizePaidAt === null)).toBe(true);
    expect(champs.every((c) => c.prizeDiamonds === 0)).toBe(true);
  });

  it("pays the saved standings when the clock later closes the season", async () => {
    const [first] = await seatPodium("later", "b", "c");
    const before = await purse(first.id);

    await archiveSeasonStandings(seasonId);
    await closeSeason(seasonId);

    expect(await purse(first.id)).toBe(before + SEASON_PRIZES[0].diamonds);
  });

  it("leaves a champion whose empire is gone unpaid, and still closes", async () => {
    const [first] = await seatPodium("vanished", "b", "c");

    // Archived while he existed, wiped before the season was sealed.
    await archiveSeasonStandings(seasonId);
    await prisma.user.deleteMany({ where: { email: `vanished@${TAG}.test` } });

    expect(await closeSeason(seasonId)).toBe(true);

    const champs = await championsOf(seasonId);
    const ghost = champs.find((c) => c.empireId === first.id);
    // His place is history; the purse never left the game.
    expect(ghost?.prizePaidAt).toBeNull();
    expect(ghost?.prizeDiamonds).toBe(0);
    // The rest of the podium was still paid.
    expect(champs.filter((c) => c.prizePaidAt !== null)).toHaveLength(2);
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
