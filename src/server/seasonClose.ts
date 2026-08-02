import "server-only";
import { cache } from "react";
import type { Prisma, SeasonBoardKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatGameDateTime } from "@/lib/game/time";
import { announceToDiscord, gameLink } from "@/server/discord";

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

/** Rows kept per board of היכל התהילה — כוח כללי, ריגול and הברית החזקה. */
export const HALL_BOARD_SIZE = 5;

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

/** One archived row of one hall board, before it is given its season stamps. */
export interface HallBoardSnapshot {
  kind: SeasonBoardKind;
  rank: number;
  empireId: string | null;
  name: string;
  playerName: string | null;
  note: string | null;
  value: number;
}

/**
 * The three boards of היכל התהילה, read at closing time: כוח כללי, ריגול and
 * הברית החזקה.
 *
 * Deliberately archived rather than derived on read. The hall is the record of
 * *finished* seasons, so its figures must be frozen the moment the season ends —
 * a board recomputed from live tables would silently start reporting the new
 * season the moment the next one opens, which is exactly what this must never
 * do. It also has to survive the season reset that deletes every empire and
 * guild these rows are read from.
 *
 * Ranked off the same denormalised columns the live ladders rank by
 * (`militaryPower`, `spyPower`, and the summed member power the guild board
 * uses), so the archive says what players actually saw all season. The power
 * board carries the podium's hero tiebreak so its first place is the same
 * empire as the season's champion.
 *
 * A row worth zero is dropped: a board nobody competed in is noise, not a
 * ranking — the same rule the recap's `named()` applies.
 */
async function buildHallBoards(
  tx: Prisma.TransactionClient
): Promise<HallBoardSnapshot[]> {
  const [byPower, bySpy, byGuild] = await Promise.all([
    tx.empire.findMany({
      orderBy: { militaryPower: "desc" },
      // Over-read so the hero tiebreak has something to reorder, as buildPodium does.
      take: HALL_BOARD_SIZE * 4,
      select: {
        id: true,
        name: true,
        cities: true,
        militaryPower: true,
        user: { select: { name: true } },
        hero: { select: { level: true, resets: true } },
      },
    }),
    tx.empire.findMany({
      orderBy: [{ spyPower: "desc" }, { name: "asc" }],
      take: HALL_BOARD_SIZE,
      select: {
        id: true,
        name: true,
        spyPower: true,
        user: { select: { name: true } },
      },
    }),
    // Guild strength is the sum of its members' power — there is no column for
    // it, so it is aggregated here exactly as the recap's guild board does.
    tx.$queryRaw<{ name: string; members: bigint; power: number | null }[]>`
      SELECT g.name, COUNT(m.id) AS members, SUM(e."militaryPower") AS power
      FROM "Guild" g
      JOIN "GuildMember" m ON m."guildId" = g.id
      JOIN "Empire" e ON e.id = m."empireId"
      GROUP BY g.id, g.name
      ORDER BY power DESC NULLS LAST
      LIMIT ${HALL_BOARD_SIZE}
    `,
  ]);

  const rows: HallBoardSnapshot[] = [];
  const push = (kind: SeasonBoardKind, entries: Omit<HallBoardSnapshot, "kind" | "rank">[]) => {
    entries
      .filter((e) => e.value > 0)
      .forEach((e, i) => rows.push({ ...e, kind, rank: i + 1 }));
  };

  push(
    "POWER",
    byPower
      .sort(
        (a, b) =>
          b.militaryPower - a.militaryPower ||
          (b.hero?.level ?? 1) - (a.hero?.level ?? 1) ||
          (b.hero?.resets ?? 0) - (a.hero?.resets ?? 0)
      )
      .slice(0, HALL_BOARD_SIZE)
      .map((e) => ({
        empireId: e.id,
        name: e.name,
        playerName: e.user?.name ?? null,
        note: `${e.cities} ערים`,
        value: Math.floor(e.militaryPower),
      }))
  );

  push(
    "SPY",
    bySpy.map((e) => ({
      empireId: e.id,
      name: e.name,
      playerName: e.user?.name ?? null,
      note: null,
      value: Math.floor(e.spyPower),
    }))
  );

  push(
    "GUILD",
    byGuild.map((g) => ({
      // A guild has no dossier to open — the name stays flat text in the hall.
      empireId: null,
      name: g.name,
      playerName: null,
      note: `${Number(g.members)} חברים`,
      value: Math.floor(g.power ?? 0),
    }))
  );

  return rows;
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

/* --------------------------- announcements --------------------------- */

/**
 * The line that introduces the podium in the channel.
 *
 * Counted rather than hardcoded at three: a season can close with fewer empires
 * than `PODIUM_SIZE` (an early season, a game that was just reset), and "קבלו את
 * שלושת השחקנים" over two names is the kind of small lie players notice.
 */
function podiumIntro(count: number): string {
  const who =
    count === 1
      ? "השחקן שהחזיק מעמד כל הסיזן והוכיח את עצמו"
      : `${count === 2 ? "שני" : "שלושת"} השחקנים שהחזיקו מעמד כל הסיזן והוכיחו את עצמם`;
  return `קבלו את ${who} 👑`;
}

/**
 * A season **opening**, announced in the channel.
 *
 * The mirror image of the podium post below: a season is the game's longest
 * arc, and both of its ends are news. The open is the more useful of the two —
 * it is the only place a player is told the new deadline they are now racing,
 * and the season pass everyone has to climb again starts the moment it fires.
 * That is why it is posted from every path that can flip a season live, not
 * only from the admin's own click.
 *
 * It deliberately does not say anybody was reset. Activating a season carries
 * every empire into it untouched (`resetSeason` is the separate, confirmed
 * wipe), so the only thing this may promise is what actually rolls over.
 *
 * Fires **after** the activation has committed, and cannot fail it —
 * `announceToDiscord` swallows everything. Callers must have won whatever guard
 * makes them the single activator, or the channel gets one post per racing
 * request.
 *
 * The deadline goes in as Jerusalem wall time: the announcer runs on a server
 * set to UTC, and a season end announced three hours early is simply wrong.
 */
export async function announceSeasonStart(season: {
  name: string;
  endsAt: Date;
}): Promise<void> {
  await announceToDiscord({
    kind: "season",
    title: `🚀 ${season.name} התחילה`,
    body:
      `סיזן חדש באוויר. 🏁\n⏳ נגמר ב-${formatGameDateTime(season.endsAt)}\n\n` +
      "דרך התהילה מתאפסת — הסולם חוזר לאפס והפרימיום נקנה מחדש.\n" +
      "מי שמסיים בטופ 3 כשהשעון נגמר נכנס להיכל התהילה. 🏆",
    url: gameLink("/game/base"),
  });
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
  const [podium, boards, recap] = await Promise.all([
    buildPodium(tx),
    buildHallBoards(tx),
    buildRecap(tx, season.startsAt),
  ]);

  // Every archived row carries the season's own name and dates, so the hall can
  // be read without the GameSeason row ever being touched.
  const stamp = {
    seasonId: season.id,
    seasonName: season.name,
    seasonStartsAt: season.startsAt,
    seasonEndsAt: season.endsAt,
  };

  let written = 0;
  if (podium.length > 0) {
    const result = await tx.seasonChampion.createMany({
      data: podium.map((c) => ({ ...stamp, ...c })),
      skipDuplicates: true,
    });
    written = result.count;
  }

  // The three hall boards, under the same first-archive-wins rule as the podium:
  // `skipDuplicates` against @@unique([seasonId, kind, rank]) means a second
  // archiving pass (admin first, clock later) reads as a no-op instead of
  // rewriting a hall players have already seen.
  if (boards.length > 0) {
    await tx.seasonBoardEntry.createMany({
      data: boards.map((b) => ({ ...stamp, ...b })),
      skipDuplicates: true,
    });
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
      if (!season || season.closedAt) return null;

      const claimed = await tx.gameSeason.updateMany({
        where: { id: seasonId, closedAt: null },
        data: { closedAt: now },
      });
      if (claimed.count === 0) return null;

      await archiveSeason(tx, season);
      return season.name;
    },
    { timeout: 30_000 }
  );

  // Announced by the single caller that won the race above, and only after the
  // hall has actually been written — so the post can never advertise a podium
  // that a rolled-back transaction never archived. Read back rather than
  // returned from inside: `archiveSeason` writes with `skipDuplicates`, so the
  // rows in the hall are the truth, including for a season the admin archived
  // manually before the clock ran out. Never inside the transaction: this is a
  // network call.
  if (closed !== null) {
    const podium = await prisma.seasonChampion.findMany({
      where: { seasonId },
      orderBy: { rank: "asc" },
      take: 3,
      select: { rank: true, empireName: true, playerName: true },
    });
    const medals = ["🥇", "🥈", "🥉"];
    await announceToDiscord({
      kind: "season",
      title: `🏆 ${closed} נגמרה — זה הפודיום`,
      body:
        (podium.length > 0
          ? `${podiumIntro(podium.length)}\n\n` +
            podium
              .map(
                (row) =>
                  `${medals[row.rank - 1] ?? ""} **${row.empireName}**` +
                  (row.playerName ? ` (${row.playerName})` : "")
              )
              .join("\n")
          : "הסיזן נסגר בלי פודיום.") +
        "\n\n" +
        (podium.length === 0
          ? ""
          : podium.length === 1
            ? "הוא בהיכל התהילה מעכשיו. "
            : "הם בהיכל התהילה מעכשיו. ") +
        "סיזן חדש בדרך — כולם חוזרים לקו ההתחלה. 🔄",
      url: gameLink("/game/rankings"),
    });
  }

  return closed !== null;
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
    select: { id: true, name: true, startsAt: true, endsAt: true },
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
      // Only the request that won the guard above announces — everyone else
      // crossing `startsAt` in the same second just finds the game open. Same
      // rule as the close: after the write, never inside it.
      await announceSeasonStart(next);
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

export interface HallRow {
  rank: number;
  /**
   * The empire's dossier, when it is still in the game. Null on guild rows,
   * on rows archived without one, and on an empire that has since been wiped —
   * the hall links only ids it has just seen exist, so an archived name never
   * leads to a 404.
   */
  empireId: string | null;
  name: string;
  playerName: string | null;
  note: string | null;
  value: number;
}

export interface HallBoard {
  kind: SeasonBoardKind;
  title: string;
  /** Icon name from components/ui/Icon. */
  icon: string;
  /** What the numbers column means, for the board's sub-line. */
  unit: string;
  rows: HallRow[];
}

/** היכל התהילה: the three boards of the last season that actually finished. */
export interface HallOfFame {
  seasonId: string;
  seasonName: string;
  endsAt: Date;
  boards: HallBoard[];
}

/** The three boards, in the order the hall draws them. */
const HALL_BOARD_META: Record<
  SeasonBoardKind,
  { title: string; icon: string; unit: string }
> = {
  POWER: { title: "כוח כללי", icon: "attack", unit: "כוח צבאי" },
  SPY: { title: "ריגול", icon: "spy", unit: "כוח מודיעין" },
  GUILD: { title: "הברית החזקה", icon: "guild", unit: "כוח חברי הברית" },
};

const HALL_BOARD_ORDER: SeasonBoardKind[] = ["POWER", "SPY", "GUILD"];

/**
 * היכל התהילה — כוח כללי, ריגול and הברית החזקה, as they stood when the last
 * season ended.
 *
 * **The running season is not in here, by construction.** Every figure is read
 * off `SeasonBoardEntry`, which is written once at closing time and never
 * updated, and the query takes only seasons whose `seasonEndsAt` is already in
 * the past. That second condition is what keeps the *current* season out even
 * when its standings have been archived early: the admin can archive a running
 * season before a reset (see `archiveSeasonStandings`), and those rows carry a
 * deadline that has not arrived yet, so the hall ignores them until it has.
 * Nothing here reads a live Empire or Guild table for a number.
 *
 * Only the newest finished season is shown — the hall is "how last season
 * ended", not a scrollable archive of all of them. Older seasons keep their
 * rows in the table and their podium on the season recap page.
 *
 * Read live, like every other board in the game (see [[no-cached-boards]]):
 * fifteen rows off a unique index, a handful of times a year, is not worth the
 * question "is this stale?".
 */
export async function getHallOfFame(): Promise<HallOfFame | null> {
  const now = new Date();

  // Newest *finished* season that has an archived hall. One row off the
  // seasonEndsAt index, and it names the season the boards below belong to.
  const newest = await prisma.seasonBoardEntry.findFirst({
    where: { seasonEndsAt: { lte: now } },
    orderBy: { seasonEndsAt: "desc" },
    select: { seasonId: true, seasonName: true, seasonEndsAt: true },
  });
  if (!newest) return null;

  const rows = await prisma.seasonBoardEntry.findMany({
    where: { seasonId: newest.seasonId },
    orderBy: [{ kind: "asc" }, { rank: "asc" }],
    select: {
      kind: true,
      rank: true,
      empireId: true,
      name: true,
      playerName: true,
      note: true,
      value: true,
    },
  });

  // Which of the archived empires still have a dossier to open. The archive is
  // deliberately unconstrained — it outlives the season *and* the empires it
  // names — so an id here can point at a row a wipe has since removed. At most
  // ten ids, looked up once on the primary key.
  const archivedIds = [
    ...new Set(rows.map((r) => r.empireId).filter((id): id is string => id !== null)),
  ];
  const alive = new Set(
    archivedIds.length === 0
      ? []
      : (
          await prisma.empire.findMany({
            where: { id: { in: archivedIds } },
            select: { id: true },
          })
        ).map((e) => e.id)
  );

  const boards: HallBoard[] = HALL_BOARD_ORDER.map((kind) => ({
    kind,
    ...HALL_BOARD_META[kind],
    rows: rows
      .filter((r) => r.kind === kind)
      .map((r) => ({
        rank: r.rank,
        empireId: r.empireId && alive.has(r.empireId) ? r.empireId : null,
        name: r.name,
        playerName: r.playerName,
        note: r.note,
        value: r.value,
      })),
  })).filter((b) => b.rows.length > 0);

  if (boards.length === 0) return null;

  return {
    seasonId: newest.seasonId,
    seasonName: newest.seasonName,
    endsAt: newest.seasonEndsAt,
    boards,
  };
}
