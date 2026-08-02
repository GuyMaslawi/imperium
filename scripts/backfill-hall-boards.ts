/**
 * One-off backfill of היכל התהילה's three boards for seasons that closed
 * before `SeasonBoardEntry` existed.
 *
 *   npx tsx scripts/backfill-hall-boards.ts          # dry run, prints the plan
 *   npx tsx scripts/backfill-hall-boards.ts --apply  # writes
 *
 * From `closeSeason` onwards the boards are archived as part of sealing a
 * season, so this is only needed for history that predates the table. The
 * figures are recovered from the season's frozen `recap` JSON, which already
 * held the same three rankings (`military`, `spy`, `guilds`) — nothing is
 * recomputed from live tables, because the empires those seasons ranked are
 * long gone.
 *
 * What the recap cannot give back is `empireId`: it stores names and numbers
 * only. Backfilled rows therefore carry no dossier link, which is the same
 * thing the hall shows for any empire that has since been wiped.
 *
 * Idempotent: rows go in with `skipDuplicates` against
 * @@unique([seasonId, kind, rank]), and a season that already has boards is
 * skipped outright. A season whose GameSeason row (and with it the recap) has
 * been deleted cannot be recovered and is reported as such.
 */
import { PrismaClient, type Prisma, type SeasonBoardKind } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

/**
 * Kept in step with `HALL_BOARD_SIZE` in src/server/seasonClose.ts, and narrowed
 * here rather than imported: that module is `server-only`, which cannot resolve
 * under plain Node (the same trap the DB test suite stubs around).
 */
const HALL_BOARD_SIZE = 5;

type RecapRow = { name: string; value: number; note?: string };
type RecapBoard = { key: string; rows: RecapRow[] };

/** The v1 recap shape, tolerating anything older or malformed. */
function readRecap(value: Prisma.JsonValue | null): { boards: RecapBoard[] } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as unknown as { version?: number; boards?: RecapBoard[] };
  return r.version === 1 && Array.isArray(r.boards) ? { boards: r.boards } : null;
}

/** Recap board key → hall board. The other recap categories have no board. */
const KIND_BY_RECAP_KEY: Record<string, SeasonBoardKind> = {
  military: "POWER",
  spy: "SPY",
  guilds: "GUILD",
};

async function main() {
  const seasons = await prisma.gameSeason.findMany({
    where: { closedAt: { not: null } },
    orderBy: { endsAt: "asc" },
    select: { id: true, name: true, startsAt: true, endsAt: true, recap: true },
  });

  // Which of them already have a hall — including seasons whose GameSeason row
  // is gone, which is why this is read off the archive table and not a join.
  const done = new Set(
    (
      await prisma.seasonBoardEntry.groupBy({ by: ["seasonId"] })
    ).map((r) => r.seasonId)
  );

  let written = 0;
  for (const season of seasons) {
    if (done.has(season.id)) {
      console.log(`· ${season.name}: already has boards, skipped`);
      continue;
    }

    const recap = readRecap(season.recap);
    if (!recap) {
      console.log(`! ${season.name}: no readable recap — nothing to recover`);
      continue;
    }

    const data = recap.boards.flatMap((board) => {
      const kind = KIND_BY_RECAP_KEY[board.key];
      if (!kind) return [];
      return board.rows.slice(0, HALL_BOARD_SIZE).map((row, i) => ({
        seasonId: season.id,
        seasonName: season.name,
        seasonStartsAt: season.startsAt,
        seasonEndsAt: season.endsAt,
        kind,
        rank: i + 1,
        // The recap kept names, not ids: no dossier links on recovered rows.
        empireId: null,
        name: row.name,
        playerName: null,
        note: row.note ?? null,
        value: row.value,
      }));
    });

    if (data.length === 0) {
      console.log(`! ${season.name}: recap holds none of the three boards`);
      continue;
    }

    console.log(
      `${apply ? "→" : "·"} ${season.name}: ${data.length} row(s) — ` +
        [...new Set(data.map((d) => d.kind))].join(", ")
    );

    if (apply) {
      const result = await prisma.seasonBoardEntry.createMany({
        data,
        skipDuplicates: true,
      });
      written += result.count;
    }
  }

  console.log(
    apply
      ? `\nDone — ${written} row(s) written.`
      : "\nDry run. Re-run with --apply to write."
  );
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
