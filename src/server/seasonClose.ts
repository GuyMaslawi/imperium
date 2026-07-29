import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The end of a season, and the gate it closes behind it.
 *
 * A season is a fixed window: it starts at `startsAt` and it is over at
 * `endsAt`. When the clock runs out the game does not keep going quietly — the
 * season is sealed, its final standings are archived, and **every game screen
 * shuts** until the next season's `startsAt` arrives. In between, all anyone
 * can reach is `/season`: the recap of what just happened plus a countdown to
 * the next one.
 *
 * ## Why this is lazy, and why that is safe
 *
 * There is no cron in this deployment (see the lazy game clock in
 * lib/game/updates.ts and the lazy war rounds in lib/game/guildWar.ts — same
 * story). So the close runs on whichever request first observes `endsAt` in the
 * past. `getSeasonGate` is called from `requireEmpire` and `getActiveEmpireId`,
 * which between them front every page load and every server action, so the
 * first person to touch the game after the deadline pays for the close and
 * everybody else lands on an already-closed season.
 *
 * That makes the close a race by construction: a hundred requests can cross
 * `endsAt` in the same millisecond. The mutex is the guarded write, exactly as
 * with resource spending (`updateMany` with the precondition in the WHERE — see
 * lib/game/updates.ts):
 *
 *     updateMany({ where: { id, closedAt: null }, data: { closedAt: now } })
 *
 * Exactly one of those reports `count === 1`; that request, and only it, writes
 * the champions and the recap. Everyone else reads the finished archive. The
 * whole thing runs in one transaction so a season can never end up sealed with
 * an empty hall of fame.
 *
 * ## Why nothing here is a join
 *
 * The admin's season reset deletes every Empire and Guild row in the game. A
 * champion of season 1 has to outlive the empire that won it, so the archive is
 * a pure snapshot: names, numbers and a bare (unconstrained) empire id kept
 * only as a breadcrumb. Same for `recap` — it is frozen JSON, not a query the
 * recap page re-runs.
 */

/** Podium places kept per season in היכל התהילה. */
export const PODIUM_SIZE = 3;

/** Rows shown per category on the season recap. */
export const RECAP_BOARD_SIZE = 5;

/* ----------------------------- recap shape ----------------------------- */

export interface RecapRow {
  name: string;
  value: number;
  /** Secondary line — guild, city, whatever the category ranks by context. */
  note?: string;
}

export interface RecapBoard {
  key: string;
  title: string;
  /** Icon name from components/ui/Icon. */
  icon: string;
  rows: RecapRow[];
}

export interface SeasonRecapTotals {
  empires: number;
  guilds: number;
  battles: number;
  goldPlundered: number;
  soldiersLost: number;
  soldiersEnslaved: number;
}

/**
 * The frozen story of a finished season. Versioned because it is stored JSON:
 * a shape change must not make every previously archived season unreadable.
 */
export interface SeasonRecap {
  version: 1;
  totals: SeasonRecapTotals;
  boards: RecapBoard[];
}

/** Narrow stored JSON back to a recap, tolerating anything older or malformed. */
export function readRecap(value: Prisma.JsonValue | null): SeasonRecap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as unknown as SeasonRecap;
  return r.version === 1 && Array.isArray(r.boards) ? r : null;
}

/* ---------------------------- building it ---------------------------- */

export interface ChampionSnapshot {
  rank: number;
  empireId: string;
  empireName: string;
  playerName: string | null;
  guildName: string | null;
  power: number;
  cities: number;
  heroLevel: number;
}

/**
 * The final standings, read at closing time.
 *
 * Ranked off the denormalised `Empire.militaryPower` column — the same figure
 * the ladder ranked by all season, so the archive says what players actually
 * saw. Ties break on the hero, matching `getCityLadder`. Global, not per city:
 * "the top of the season" is one podium for the whole game.
 */
async function buildPodium(
  tx: Prisma.TransactionClient
): Promise<ChampionSnapshot[]> {
  const empires = await tx.empire.findMany({
    orderBy: { militaryPower: "desc" },
    // Over-read a little so the hero tiebreak has something to reorder.
    take: PODIUM_SIZE * 4,
    select: {
      id: true,
      name: true,
      cities: true,
      militaryPower: true,
      user: { select: { name: true } },
      hero: { select: { level: true, resets: true } },
      guildMembership: { select: { guild: { select: { name: true } } } },
    },
  });

  return empires
    .sort(
      (a, b) =>
        b.militaryPower - a.militaryPower ||
        (b.hero?.level ?? 1) - (a.hero?.level ?? 1) ||
        (b.hero?.resets ?? 0) - (a.hero?.resets ?? 0)
    )
    .slice(0, PODIUM_SIZE)
    .map((e, i) => ({
      rank: i + 1,
      empireId: e.id,
      empireName: e.name,
      playerName: e.user?.name ?? null,
      guildName: e.guildMembership?.guild.name ?? null,
      power: Math.floor(e.militaryPower),
      cities: e.cities,
      heroLevel: e.hero?.level ?? 1,
    }));
}

/**
 * Everything else that happened: five categories and the season's totals.
 *
 * Each board is an indexed `ORDER BY … LIMIT`, and the totals are aggregates —
 * this runs exactly once in the life of a season, so it is allowed to be the
 * one expensive read in the app.
 */
async function buildRecap(
  tx: Prisma.TransactionClient,
  since: Date
): Promise<SeasonRecap> {
  const named = <T extends { name: string }>(
    rows: T[],
    value: (r: T) => number,
    note?: (r: T) => string | undefined
  ): RecapRow[] =>
    rows
      .map((r) => ({ name: r.name, value: Math.floor(value(r)), note: note?.(r) }))
      // A category nobody competed in is noise, not a ranking.
      .filter((r) => r.value > 0);

  const [
    military,
    spies,
    slaves,
    bank,
    guilds,
    raiders,
    empireCount,
    guildCount,
    battleTotals,
  ] = await Promise.all([
    tx.empire.findMany({
      orderBy: { militaryPower: "desc" },
      take: RECAP_BOARD_SIZE,
      select: { name: true, militaryPower: true, cities: true },
    }),
    tx.empire.findMany({
      orderBy: { spyPower: "desc" },
      take: RECAP_BOARD_SIZE,
      select: { name: true, spyPower: true },
    }),
    tx.empire.findMany({
      orderBy: { army: { mineSlaves: "desc" } },
      take: RECAP_BOARD_SIZE,
      select: { name: true, army: { select: { mineSlaves: true } } },
    }),
    tx.empire.findMany({
      orderBy: { bankAccount: { goldBalance: "desc" } },
      take: RECAP_BOARD_SIZE,
      select: { name: true, bankAccount: { select: { goldBalance: true } } },
    }),
    tx.$queryRaw<{ name: string; members: bigint; power: number | null }[]>`
      SELECT g.name, COUNT(m.id) AS members, SUM(e."militaryPower") AS power
      FROM "Guild" g
      JOIN "GuildMember" m ON m."guildId" = g.id
      JOIN "Empire" e ON e.id = m."empireId"
      GROUP BY g.id, g.name
      ORDER BY power DESC NULLS LAST
      LIMIT ${RECAP_BOARD_SIZE}
    `,
    tx.battleReport.groupBy({
      by: ["attackerEmpireId"],
      where: { createdAt: { gte: since }, stolenGold: { gt: 0 } },
      _sum: { stolenGold: true },
      orderBy: { _sum: { stolenGold: "desc" } },
      take: RECAP_BOARD_SIZE,
    }),
    tx.empire.count(),
    tx.guild.count(),
    tx.battleReport.aggregate({
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: {
        stolenGold: true,
        attackerSoldiersLost: true,
        defenderSoldiersLost: true,
        enslavedSoldiers: true,
      },
    }),
  ]);

  // The raid board comes back as ids (BattleReport has no name), so resolve
  // just those five rather than every empire in the game.
  const raiderNames = new Map(
    (
      await tx.empire.findMany({
        where: { id: { in: raiders.map((r) => r.attackerEmpireId) } },
        select: { id: true, name: true },
      })
    ).map((e) => [e.id, e.name])
  );

  const boards: RecapBoard[] = [
    {
      key: "military",
      title: "כוח צבאי",
      icon: "attack",
      rows: named(
        military,
        (e) => e.militaryPower,
        (e) => `${e.cities} ערים`
      ),
    },
    {
      key: "guilds",
      title: "בריתות",
      icon: "guild",
      rows: named(
        guilds.map((g) => ({ name: g.name, power: g.power ?? 0, members: Number(g.members) })),
        (g) => g.power,
        (g) => `${g.members} חברים`
      ),
    },
    {
      key: "raid",
      title: "שוד זהב",
      icon: "gold",
      rows: named(
        raiders.map((r) => ({
          name: raiderNames.get(r.attackerEmpireId) ?? "אימפריה",
          gold: r._sum.stolenGold ?? 0,
        })),
        (r) => r.gold
      ),
    },
    {
      key: "spy",
      title: "מודיעין",
      icon: "spy",
      rows: named(spies, (e) => e.spyPower),
    },
    {
      key: "slaves",
      title: "עבדי מכרה",
      icon: "citizens",
      rows: named(slaves, (e) => e.army?.mineSlaves ?? 0),
    },
    {
      key: "bank",
      title: "הון בבנק",
      icon: "bank",
      rows: named(bank, (e) => e.bankAccount?.goldBalance ?? 0),
    },
  ].filter((b) => b.rows.length > 0);

  return {
    version: 1,
    totals: {
      empires: empireCount,
      guilds: guildCount,
      battles: battleTotals._count._all,
      goldPlundered: Math.floor(battleTotals._sum.stolenGold ?? 0),
      soldiersLost:
        (battleTotals._sum.attackerSoldiersLost ?? 0) +
        (battleTotals._sum.defenderSoldiersLost ?? 0),
      soldiersEnslaved: battleTotals._sum.enslavedSoldiers ?? 0,
    },
    boards,
  };
}

/* ------------------------------ closing ------------------------------ */

/** A season row, as everything below needs to see it. */
type ArchivableSeason = {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  recap: Prisma.JsonValue | null;
};

/**
 * Write a season's podium into היכל התהילה and freeze its recap.
 *
 * **First archive wins.** The champions go in with `skipDuplicates` against
 * `@@unique([seasonId, rank])`, and the recap is only written if the row does
 * not already have one. A season can be archived from two directions — the
 * admin ticking "save the standings" before a manual reset, and the clock
 * running out later — and re-running this must never rewrite history that has
 * already been published to the hall.
 *
 * Every column written here is a snapshot, the season's own name and dates
 * included, so the record survives both the empire wipe and the deletion of the
 * GameSeason row itself.
 */
async function archiveSeason(
  tx: Prisma.TransactionClient,
  season: ArchivableSeason
): Promise<number> {
  const [podium, recap] = await Promise.all([
    buildPodium(tx),
    buildRecap(tx, season.startsAt),
  ]);

  let written = 0;
  if (podium.length > 0) {
    const result = await tx.seasonChampion.createMany({
      data: podium.map((c) => ({
        seasonId: season.id,
        seasonName: season.name,
        seasonStartsAt: season.startsAt,
        seasonEndsAt: season.endsAt,
        ...c,
      })),
      skipDuplicates: true,
    });
    written = result.count;
  }

  if (!season.recap) {
    await tx.gameSeason.update({
      where: { id: season.id },
      data: { recap: recap as unknown as Prisma.InputJsonValue },
    });
  }

  return written;
}

/**
 * Archive a season's standings **without ending it** — the admin path.
 *
 * `resetSeason` and `deleteSeason` are about to destroy the data these figures
 * are derived from, so the admin is offered the chance to preserve them first.
 * Deliberately does not touch `closedAt`: saving a record is not the same as
 * declaring the season over, and a reset button must not lock every player out
 * of the game as a side effect.
 *
 * Returns how many podium rows were newly written.
 */
export async function archiveSeasonStandings(seasonId: string): Promise<number> {
  const season = await prisma.gameSeason.findUnique({
    where: { id: seasonId },
    select: { id: true, name: true, startsAt: true, endsAt: true, recap: true },
  });
  if (!season) return 0;

  const written = await prisma.$transaction((tx) => archiveSeason(tx, season), {
    timeout: 30_000,
  });
  return written;
}

/**
 * Seal a season: archive its final standings, then stamp `closedAt` — which is
 * what actually shuts the game.
 *
 * Idempotent, and safe under any number of concurrent callers. The guarded
 * `updateMany` is the mutex: the precondition lives in the WHERE, not in an
 * `if` above it, because two requests that both read `closedAt: null` a
 * microsecond apart would both pass a read-then-write check and both go on to
 * archive. The loser does no work and returns `false`.
 *
 * Archiving happens *inside* the same transaction as the stamp, so a season can
 * never end up sealed with an empty hall of fame.
 *
 * Returns whether *this* call was the one that closed it.
 */
export async function closeSeason(
  seasonId: string,
  now: Date = new Date()
): Promise<boolean> {
  const closed = await prisma.$transaction(
    async (tx) => {
      const season = await tx.gameSeason.findUnique({
        where: { id: seasonId },
        select: { id: true, name: true, startsAt: true, endsAt: true, recap: true, closedAt: true },
      });
      if (!season || season.closedAt) return false;

      const claimed = await tx.gameSeason.updateMany({
        where: { id: seasonId, closedAt: null },
        data: { closedAt: now },
      });
      if (claimed.count === 0) return false;

      await archiveSeason(tx, season);
      return true;
    },
    { timeout: 30_000 }
  );

  return closed;
}

/* -------------------------------- gate -------------------------------- */

export type SeasonGate =
  | { open: true }
  | {
      open: false;
      seasonId: string;
      seasonName: string;
      closedAt: Date;
      /** When the next season opens — null if the admin has not scheduled one. */
      nextStartsAt: Date | null;
      nextSeasonName: string | null;
    };

/**
 * Is the game open right now?
 *
 * Closed means: there is an active season, its clock has run out, and the next
 * one has not started yet. Everything else is open — including "no active
 * season at all", which is what a fresh install and every local dev database
 * look like. A game with no seasons configured must not lock itself out.
 *
 * Three things happen here, in order, and all of them are lazy:
 *  1. an active season past `endsAt` is closed (archived) on the spot;
 *  2. a scheduled successor whose `startsAt` has arrived is activated, which
 *     reopens the game by itself — the countdown on /season is a promise the
 *     server has to keep without an admin awake at 3am;
 *  3. whatever is left is reported as open or shut.
 *
 * Deliberately **not** an auto-reset. Activating the next season carries every
 * empire into it untouched; wiping the world is `resetSeason`, which stays a
 * deliberate, confirmed admin action — nothing implicit should ever delete
 * every player's progress.
 *
 * `cache`d per request: it is called from `requireEmpire` *and*
 * `getActiveEmpireId`, and a page load hits both.
 */
export const getSeasonGate = cache(async (): Promise<SeasonGate> => {
  const now = new Date();

  const active = await prisma.gameSeason.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, endsAt: true, closedAt: true },
  });
  if (!active) return { open: true };
  if (active.endsAt > now) return { open: true };

  let closedAt = active.closedAt;
  if (!closedAt) {
    await closeSeason(active.id, now);
    const reread = await prisma.gameSeason.findUnique({
      where: { id: active.id },
      select: { closedAt: true },
    });
    closedAt = reread?.closedAt ?? now;
  }

  // The next season is the earliest one scheduled to start after this one ended.
  const next = await prisma.gameSeason.findFirst({
    where: { id: { not: active.id }, startsAt: { gt: active.endsAt } },
    orderBy: { startsAt: "asc" },
    select: { id: true, name: true, startsAt: true },
  });

  if (next && next.startsAt <= now) {
    // Its hour has come. Guarded the same way as the close, so simultaneous
    // requests cannot both run the swap.
    const claimed = await prisma.gameSeason.updateMany({
      where: { id: next.id, isActive: false },
      data: { isActive: true },
    });
    if (claimed.count > 0) {
      await prisma.gameSeason.updateMany({
        where: { isActive: true, id: { not: next.id } },
        data: { isActive: false },
      });
    }
    return { open: true };
  }

  return {
    open: false,
    seasonId: active.id,
    seasonName: active.name,
    closedAt,
    nextStartsAt: next?.startsAt ?? null,
    nextSeasonName: next?.name ?? null,
  };
});

/* ------------------------------ the hall ------------------------------ */

export interface HallChampion {
  rank: number;
  empireName: string;
  playerName: string | null;
  guildName: string | null;
  power: number;
  cities: number;
  heroLevel: number;
}

export interface HallSeason {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  champions: HallChampion[];
}

/**
 * היכל התהילה — every archived season and who topped it, newest first.
 *
 * Read straight off `SeasonChampion` and grouped in JS rather than joined from
 * `GameSeason`: the whole point of the archive is that it outlives the season
 * row, so a season the admin has since deleted must still appear in the hall.
 * Every field the board draws lives on the champion row for exactly that
 * reason.
 *
 * Read live, like every other board. This one is the odd case — a frozen archive
 * written three rows at a time, a handful of times a year — and it did sit behind
 * a five-minute TTL. But it is three rows per season ordered off an index, so the
 * cache was saving nothing worth the question "is this stale?", which is the one
 * question no board in this game should raise.
 */
export async function getHallOfFame(): Promise<HallSeason[]> {
  const rows = await prisma.seasonChampion.findMany({
    orderBy: [{ seasonEndsAt: "desc" }, { rank: "asc" }],
    select: {
      seasonId: true,
      seasonName: true,
      seasonStartsAt: true,
      seasonEndsAt: true,
      rank: true,
      empireName: true,
      playerName: true,
      guildName: true,
      power: true,
      cities: true,
      heroLevel: true,
    },
  });

  const bySeason = new Map<string, HallSeason>();
  for (const r of rows) {
    let season = bySeason.get(r.seasonId);
    if (!season) {
      season = {
        id: r.seasonId,
        name: r.seasonName,
        startsAt: r.seasonStartsAt,
        endsAt: r.seasonEndsAt,
        champions: [],
      };
      bySeason.set(r.seasonId, season);
    }
    season.champions.push({
      rank: r.rank,
      empireName: r.empireName,
      playerName: r.playerName,
      guildName: r.guildName,
      power: r.power,
      cities: r.cities,
      heroLevel: r.heroLevel,
    });
  }

  return [...bySeason.values()];
}
