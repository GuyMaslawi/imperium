import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient, type Prisma } from "@prisma/client";
import { closeSeason, openSeason } from "@/server/seasonClose";
import { mergeTunables, type GameTunables } from "@/lib/game/config";

/**
 * The cycle that turns by itself: seal → book the successor → open it.
 *
 * All three run lazily, on whichever page load happens to cross the boundary,
 * which makes every one of them a race between however many players refreshed
 * at the same second. That is why this suite is database-backed: the mutex on
 * both ends is a guarded `updateMany` whose precondition lives in the WHERE
 * clause, and only Postgres can tell us whether exactly one of thirty
 * simultaneous callers got through.
 *
 * **Run this against a scratch database.** Booking a season is global by
 * nature — `scheduleNextSeason` stands down if *any* future season is on the
 * books — so it reads rows this file did not create. The world restart that the
 * opening performs is more than global, it is destructive, so it is kept behind
 * `KRALDOR_DESTRUCTIVE_TESTS=1` and skipped by default: nobody should lose the
 * empire they were playing with by running the test suite.
 */

const prisma = new PrismaClient();
const TAG = `cy${Date.now().toString(36)}`;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Everything the file created, cleaned up by id. */
const createdSeasons: string[] = [];

/**
 * When this file started. Successors are booked by the code under test, so
 * nothing here knows their ids or their names — `nextSeasonName` raises the
 * last run of digits, and the tag above is `Date.now().toString(36)`, so the
 * successor of `cy1a5b-s1` is `cy1a6b-s1` and carries no tag at all. "Created
 * since this file started" is the only handle that catches them, and the
 * suite's serial execution makes it exact.
 */
const SUITE_START = new Date();

/** The global config row as we found it — this suite edits it. */
let savedConfig: Prisma.JsonValue | null = null;
let hadConfig = false;

const destructive = process.env.KRALDOR_DESTRUCTIVE_TESTS === "1";

beforeAll(async () => {
  const row = await prisma.gameConfig.findUnique({ where: { id: "singleton" } });
  hadConfig = row !== null;
  savedConfig = row?.data ?? null;
});

afterAll(async () => {
  await prisma.seasonChampion.deleteMany({ where: { seasonId: { in: createdSeasons } } });
  await prisma.seasonBoardEntry.deleteMany({ where: { seasonId: { in: createdSeasons } } });
  await prisma.gameSeason.deleteMany({ where: { createdAt: { gte: SUITE_START } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  // Put the admin's balance back exactly as it was, including "there was no row".
  if (hadConfig) {
    await prisma.gameConfig.update({
      where: { id: "singleton" },
      data: { data: (savedConfig ?? {}) as Prisma.InputJsonValue },
    });
  } else {
    await prisma.gameConfig.deleteMany({ where: { id: "singleton" } });
  }
  await prisma.$disconnect();
});

/** Point the live tunables at a specific cycle. */
async function setCycle(season: Partial<GameTunables["season"]>) {
  const merged = mergeTunables({
    ...(savedConfig as object | null),
    season: { ...mergeTunables(savedConfig).season, ...season },
  });
  await prisma.gameConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", data: merged as unknown as Prisma.InputJsonValue },
    update: { data: merged as unknown as Prisma.InputJsonValue },
  });
}

/** A season that ended a second ago and has not been sealed yet. */
async function makeFinishedSeason(name: string, endedMsAgo = 1000) {
  const season = await prisma.gameSeason.create({
    data: {
      name: `${TAG}-${name}`,
      startsAt: new Date(Date.now() - 30 * DAY),
      endsAt: new Date(Date.now() - endedMsAgo),
    },
  });
  createdSeasons.push(season.id);
  return season;
}

/** The seasons on the books besides this one — see SUITE_START. */
async function bookedSuccessors(exclude: string) {
  return prisma.gameSeason.findMany({
    where: { createdAt: { gte: SUITE_START }, id: { not: exclude } },
    orderBy: { startsAt: "asc" },
  });
}

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TAG}.test` } } });
  await prisma.gameSeason.deleteMany({ where: { createdAt: { gte: SUITE_START } } });
  await setCycle({ breakHours: 24, lengthDays: 30, autoNext: 1, autoRestart: 0 });
});

describe("booking the next season", () => {
  it("books a successor in the same breath as the seal", async () => {
    const season = await makeFinishedSeason("s1");
    await setCycle({ breakHours: 12, lengthDays: 14, autoNext: 1 });

    expect(await closeSeason(season.id)).toBe(true);

    const [next] = await bookedSuccessors(season.id);
    expect(next).toBeDefined();
    createdSeasons.push(next.id);

    // The number moved up by one, and nothing else about the name did.
    expect(next.name).toBe(`${TAG}-s2`);
    // The break is counted from the close, which is when the season really
    // ended — see nextSeasonWindow.
    const closed = await prisma.gameSeason.findUniqueOrThrow({ where: { id: season.id } });
    expect(next.startsAt.getTime()).toBe(closed.closedAt!.getTime() + 12 * HOUR);
    expect(next.endsAt.getTime() - next.startsAt.getTime()).toBe(14 * DAY);
    // Booked, not opened: the game stays shut for the whole break.
    expect(next.isActive).toBe(false);
    expect(next.closedAt).toBeNull();
  });

  it("books nothing when the cycle is switched off", async () => {
    const season = await makeFinishedSeason("s7");
    await setCycle({ autoNext: 0 });

    expect(await closeSeason(season.id)).toBe(true);
    expect(await bookedSuccessors(season.id)).toHaveLength(0);
  });

  it("leaves an already-scheduled season alone", async () => {
    const season = await makeFinishedSeason("s3");
    // The admin got there first and named the successor themselves.
    const planned = await prisma.gameSeason.create({
      data: {
        name: `${TAG}-planned`,
        startsAt: new Date(Date.now() + 5 * DAY),
        endsAt: new Date(Date.now() + 20 * DAY),
      },
    });
    createdSeasons.push(planned.id);

    expect(await closeSeason(season.id)).toBe(true);

    const successors = await bookedSuccessors(season.id);
    expect(successors).toHaveLength(1);
    expect(successors[0].id).toBe(planned.id);
  });

  it("books exactly one successor under a simultaneous burst", async () => {
    // Thirty players refreshing at the deadline. The close is behind the
    // `closedAt` mutex and the booking rides inside the same transaction, so
    // the schedule cannot grow one season per page load.
    const season = await makeFinishedSeason("s5");
    const results = await Promise.all(
      Array.from({ length: 30 }, () => closeSeason(season.id))
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    const successors = await bookedSuccessors(season.id);
    expect(successors).toHaveLength(1);
    createdSeasons.push(successors[0].id);
  });
});

describe("opening the booked season", () => {
  it("opens it exactly once under a simultaneous burst", async () => {
    const next = await makeFinishedSeason("open1", -5 * DAY); // ends in 5 days
    await prisma.gameSeason.update({
      where: { id: next.id },
      data: { startsAt: new Date(Date.now() - 1000) },
    });

    const results = await Promise.all(
      Array.from({ length: 20 }, () => openSeason(next, new Date()))
    );
    expect(results.filter(Boolean)).toHaveLength(1);

    const reread = await prisma.gameSeason.findUniqueOrThrow({ where: { id: next.id } });
    expect(reread.isActive).toBe(true);
  });

  it("is the only active season afterwards", async () => {
    const outgoing = await makeFinishedSeason("out1");
    await prisma.gameSeason.update({
      where: { id: outgoing.id },
      data: { isActive: true, closedAt: new Date() },
    });
    const next = await makeFinishedSeason("in1", -5 * DAY);

    expect(await openSeason(next, new Date())).not.toBeNull();

    const rows = await prisma.gameSeason.findMany({
      where: { name: { startsWith: TAG }, isActive: true },
    });
    expect(rows.map((r) => r.id)).toEqual([next.id]);
  });

  it("pushes a season whose own clock already ran out forward", async () => {
    // The server was down for a month, or an admin booked one and forgot.
    // Opening it unchanged would seal the game again on the very next page
    // load, and the cycle would stop for good.
    await setCycle({ lengthDays: 7 });
    const stale = await makeFinishedSeason("stale1", 10 * DAY);
    const now = new Date();

    expect(await openSeason(stale, now)).not.toBeNull();

    const reread = await prisma.gameSeason.findUniqueOrThrow({ where: { id: stale.id } });
    expect(reread.startsAt.getTime()).toBe(now.getTime());
    expect(reread.endsAt.getTime()).toBe(now.getTime() + 7 * DAY);
    expect(reread.endsAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("re-homes every empire onto the season being played", async () => {
    // With the restart switched off nobody's progress is touched — but
    // `Empire.seasonId` still has to name the season people are in, since the
    // admin's broadcast and ban targeting read it.
    await setCycle({ autoRestart: 0 });
    const next = await makeFinishedSeason("home1", -5 * DAY);
    const user = await prisma.user.create({
      data: {
        email: `home@${TAG}.test`,
        name: "שחקן",
        passwordHash: "x",
        emailVerified: new Date(),
      },
    });
    const empire = await prisma.empire.create({
      data: { userId: user.id, name: `${TAG}-home`, gold: 12_345, diamonds: 77 },
    });

    expect(await openSeason(next, new Date())).not.toBeNull();

    const reread = await prisma.empire.findUniqueOrThrow({ where: { id: empire.id } });
    expect(reread.seasonId).toBe(next.id);
    // Untouched: this is the carry-over path.
    expect(reread.gold).toBe(12_345);
    expect(reread.id).toBe(empire.id);
  });

  it.runIf(destructive)(
    "restarts the world when the cycle says so, keeping diamonds",
    async () => {
      // DESTRUCTIVE: deletes every empire and guild in the database, which is
      // exactly what the feature does. Opt in with KRALDOR_DESTRUCTIVE_TESTS=1
      // against a scratch database.
      await setCycle({ autoRestart: 1 });
      const next = await makeFinishedSeason("wipe1", -5 * DAY);
      const user = await prisma.user.create({
        data: {
          email: `wipe@${TAG}.test`,
          name: "שחקן",
          passwordHash: "x",
          emailVerified: new Date(),
        },
      });
      const vipSince = new Date("2026-01-01T00:00:00.000Z");
      const discordJoinedAt = new Date("2026-02-02T00:00:00.000Z");
      const before = await prisma.empire.create({
        data: {
          userId: user.id,
          name: `${TAG}-wipe`,
          gold: 999_999_999,
          diamonds: 4242,
          cities: 6,
          vipSince,
          discordJoinedAt,
          bio: "נעים להכיר",
        },
      });

      const opened = await openSeason(next, new Date());
      expect(opened?.restarted).toBe(true);

      const after = await prisma.empire.findUniqueOrThrow({ where: { userId: user.id } });
      // A different row entirely — the empire was rebuilt, not edited.
      expect(after.id).not.toBe(before.id);
      expect(after.name).toBe(`${TAG}-wipe`);
      expect(after.seasonId).toBe(next.id);
      expect(after.cities).toBe(1);
      expect(after.gold).toBeLessThan(999_999_999);
      // The diamonds, and only the diamonds — they were bought with real money.
      expect(after.diamonds).toBe(4242);
      // Everything else goes, deliberately: a season is a clean race, so VIP is
      // bought again, the welcome purse can be collected again, and the profile
      // blurb is written again. See restartWorld.
      expect(after.vipSince).toBeNull();
      expect(after.discordJoinedAt).toBeNull();
      expect(after.bio).toBeNull();
      // And no new-player shield: everybody restarts equal.
      expect(after.protectedUntil).toBeNull();
      expect(await prisma.guild.count()).toBe(0);
    }
  );
});
