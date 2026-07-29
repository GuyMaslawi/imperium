import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * The city ladder: every empire in one city tier, ranked by military power.
 *
 * Ranked and cut **in SQL**, off the denormalised `Empire.militaryPower` column
 * and its `[cities, militaryPower]` index. It used to be impossible: the figure
 * was computed in JS from the army *and every row of the arsenal*, so the page
 * loaded the whole city bucket — and because `Empire.cities` defaults to 1, for
 * the whole early game that bucket was the entire table — sorted in memory and
 * threw away all but the visible rows. With AutoRefresh re-running it twice a
 * minute per open tab, ten idle spectators cost twenty full scans a minute.
 * See server/empirePower.ts for what keeps the column true.
 *
 * The cache stays, doing a smaller job: the page still needs `ranked.length`
 * and the viewer's exact rank, and those are two more round trips. One short
 * TTL means N spectators share one set. It is per-instance, which for a cache
 * is fine — a cold instance pays for one build, and two instances disagreeing
 * for a few seconds is indistinguishable from two players refreshing a few
 * seconds apart. (Contrast `lib/rateLimit.ts`, where per-instance state was the
 * bug: a limiter must agree across the fleet; a cache need not.)
 */

/** How long a computed ladder is served before it is rebuilt. */
export const LADDER_TTL_MS = 20_000;

export interface LadderRow {
  id: string;
  name: string;
  gold: number;
  army: { soldiers: number } | null;
  hero: { level: number; resets: number } | null;
  power: number;
}

interface Entry {
  rows: LadderRow[];
  builtAt: number;
}

const cache = new Map<number, Entry>();

/**
 * Bound the map. One entry per city tier, so it can never hold more than
 * MAX_CITIES rows in practice — the cap is a backstop against a stray tier
 * value, not a real pressure.
 */
const MAX_TIERS = 64;

async function build(cities: number): Promise<LadderRow[]> {
  // Ordered by the stored column, so Postgres walks the [cities, militaryPower]
  // index instead of the app loading and sorting the bucket. The arsenal is not
  // read at all any more — it was the bulk of the old query.
  const empires = await prisma.empire.findMany({
    where: { cities },
    orderBy: { militaryPower: "desc" },
    select: {
      id: true,
      name: true,
      gold: true,
      militaryPower: true,
      army: { select: { soldiers: true } },
      hero: { select: { level: true, resets: true } },
    },
  });

  return empires
    .map(({ militaryPower, ...e }) => ({ ...e, power: militaryPower }))
    // Ties on raw military power break on the hero — his level, then how many
    // times he has run the curve to 100. Done in JS because it only ever
    // reorders empires the index already placed together, and `empire.level`
    // (the old tiebreak) is a column gameplay never writes: it was 1 for
    // everyone, so ties fell through to whatever order Postgres returned.
    .sort(
      (a, b) =>
        b.power - a.power ||
        (b.hero?.level ?? 1) - (a.hero?.level ?? 1) ||
        (b.hero?.resets ?? 0) - (a.hero?.resets ?? 0)
    );
}

/**
 * The ranked ladder for one city tier, rebuilt at most once per LADDER_TTL_MS.
 *
 * Concurrent callers that arrive on a cold entry all build — no in-flight
 * dedup. Deliberate: sharing one promise means a build that fails takes every
 * waiter down with it, and the window it would save is the handful of
 * milliseconds between two requests landing on the same cold instance.
 */
export async function getCityLadder(cities: number): Promise<LadderRow[]> {
  const now = Date.now();
  const hit = cache.get(cities);
  if (hit && now - hit.builtAt < LADDER_TTL_MS) return hit.rows;

  const rows = await build(cities);
  if (cache.size >= MAX_TIERS) {
    // Map preserves insertion order; drop the oldest entry.
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(cities, { rows, builtAt: now });
  return rows;
}

/* ------------------------------ global boards ------------------------------ */

export interface BoardRow {
  empireId: string;
  name: string;
  value: number;
}

export type BoardKey = "slaves" | "bank" | "spy" | "power";

export interface GlobalBoards {
  slaves: BoardRow[];
  bank: BoardRow[];
  spy: BoardRow[];
  power: BoardRow[];
  /** Every empire's display name, for boards resolved by id (the theft board). */
  names: Map<string, string>;
}

/** Rows each global board shows. */
const BOARD_SIZE = 10;

let boardsCache: { boards: GlobalBoards; builtAt: number } | null = null;

/**
 * The four cross-game boards, top ten each — four indexed `ORDER BY … LIMIT 10`
 * queries.
 *
 * This was the worst query in the app: **global**, not one city bucket, it
 * loaded every empire in the game with its army, arsenal and bank account,
 * mapped the lot, and threw away all but forty rows — on every page load and
 * again every thirty seconds per open tab, with no rate limit on RSC GETs. The
 * old comment said it plainly: the cheapest way for any logged-in player to put
 * the database under sustained full-scan load.
 *
 * Two of the four boards (`slaves`, `bank`) could always have been ordered in
 * SQL; the other two could not, because `spy` and `power` were computed in JS.
 * Now that those live on indexed columns, all four are.
 */
export async function getGlobalBoards(): Promise<GlobalBoards> {
  const now = Date.now();
  if (boardsCache && now - boardsCache.builtAt < LADDER_TTL_MS) return boardsCache.boards;

  const top = async (
    orderBy: Prisma.EmpireOrderByWithRelationInput,
    pick: (e: {
      id: string;
      name: string;
      generalPower: number;
      spyPower: number;
      army: { mineSlaves: number } | null;
      bankAccount: { goldBalance: number } | null;
    }) => number
  ): Promise<BoardRow[]> => {
    const rows = await prisma.empire.findMany({
      orderBy,
      take: BOARD_SIZE,
      select: {
        id: true,
        name: true,
        generalPower: true,
        spyPower: true,
        army: { select: { mineSlaves: true } },
        bankAccount: { select: { goldBalance: true } },
      },
    });
    return rows
      .map((e) => ({ empireId: e.id, name: e.name, value: Math.floor(pick(e)) }))
      // A board of empires with nothing to show is noise, not a ranking.
      .filter((r) => r.value > 0);
  };

  const [slaves, bank, spy, power] = await Promise.all([
    top({ army: { mineSlaves: "desc" } }, (e) => e.army?.mineSlaves ?? 0),
    top({ bankAccount: { goldBalance: "desc" } }, (e) => e.bankAccount?.goldBalance ?? 0),
    top({ spyPower: "desc" }, (e) => e.spyPower),
    top({ generalPower: "desc" }, (e) => e.generalPower),
  ]);

  // Names for the theft board, which is aggregated off BattleReport and comes
  // back as ids. Scoped to the ids that board can actually produce rather than
  // every empire in the game.
  const names = new Map(
    [...slaves, ...bank, ...spy, ...power].map((r) => [r.empireId, r.name])
  );

  const boards: GlobalBoards = { slaves, bank, spy, power, names };
  boardsCache = { boards, builtAt: now };
  return boards;
}

/**
 * Biggest thefts since `cutoff` — total gold plundered in winning attacks.
 *
 * Aggregated and cut in SQL, unlike the four boards above, so this one is
 * genuinely cheap; it is cached anyway because it rides the same 30-second
 * refresh and there is no reason for N tabs to run N aggregations over the same
 * window. Keyed by the period label rather than the cutoff instant, which moves
 * every millisecond and would never hit.
 */
export async function getTheftBoard(
  period: string,
  cutoff: Date
): Promise<BoardRow[]> {
  const now = Date.now();
  const hit = theftCache.get(period);
  if (hit && now - hit.builtAt < LADDER_TTL_MS) return hit.rows;

  const sums = await prisma.battleReport.groupBy({
    by: ["attackerEmpireId"],
    where: { createdAt: { gte: cutoff }, stolenGold: { gt: 0 } },
    _sum: { stolenGold: true },
    orderBy: { _sum: { stolenGold: "desc" } },
    take: BOARD_SIZE,
  });
  // Resolved directly: the boards' name map only covers empires that made a
  // top ten, and a raider need not be on any of them.
  const named = await prisma.empire.findMany({
    where: { id: { in: sums.map((t) => t.attackerEmpireId) } },
    select: { id: true, name: true },
  });
  const names = new Map(named.map((e) => [e.id, e.name]));
  const rows = sums.map((t) => ({
    empireId: t.attackerEmpireId,
    name: names.get(t.attackerEmpireId) ?? "אימפריה",
    value: Math.floor(t._sum.stolenGold ?? 0),
  }));

  theftCache.set(period, { rows, builtAt: now });
  return rows;
}

const theftCache = new Map<string, { rows: BoardRow[]; builtAt: number }>();
