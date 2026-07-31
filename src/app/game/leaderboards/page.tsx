import Link from "next/link";
import type { ReactNode } from "react";
import { requireEmpire } from "@/lib/auth";
import {
  getGlobalBoards,
  getTheftBoard,
  type BoardRow,
} from "@/server/rankingsLadder";
import { formatNumber } from "@/lib/game/format";
import { AutoRefresh } from "@/components/game/AutoRefresh";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon, type IconName } from "@/components/ui/Icon";

export const metadata = { title: "טבלאות מובילים | KRALDOR" };

type Period = "day" | "week";

/** A single leaderboard, top players first. */
function Board({
  title,
  icon,
  iconClass,
  unit,
  rows,
  myEmpireId,
  hideValue = false,
}: {
  title: string;
  icon: IconName;
  iconClass: string;
  unit: ReactNode;
  rows: BoardRow[];
  myEmpireId: string;
  /** Rank the board by value but keep the actual number secret. */
  hideValue?: boolean;
}) {
  return (
    <div className="panel-gold flex flex-col rounded-xl p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-gold-bright">
        <Icon name={icon} size={18} className={iconClass} />
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">אין נתונים עדיין.</p>
      ) : (
        <ol className="space-y-1.5 text-sm">
          {rows.map((row, index) => {
            const isMe = row.empireId === myEmpireId;
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
            return (
              <li
                key={row.empireId}
                className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${
                  isMe ? "bg-gold/10" : "hover:bg-panel-raised/50"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="nums w-5 shrink-0 text-center font-black text-gold" dir="ltr">
                    {medal ?? index + 1}
                  </span>
                  <Link
                    href={`/game/empires/${row.empireId}`}
                    className="truncate font-semibold text-zinc-100 underline-offset-4 hover:text-gold-bright hover:underline"
                  >
                    {row.name}
                  </Link>
                  {isMe && (
                    <span className="shrink-0 rounded-full bg-gold/15 px-1.5 text-[10px] font-bold text-gold">
                      את/ה
                    </span>
                  )}
                </span>
                {!hideValue && (
                  <span className="nums inline-flex shrink-0 items-center gap-1 font-bold text-gold-bright" dir="ltr">
                    {formatNumber(row.value)} {unit}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Cutoff timestamp for the theft window — local midnight, or seven days back. */
function theftCutoff(period: Period): Date {
  const now = new Date();
  return period === "day"
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ theft?: string }>;
}) {
  const myEmpire = await requireEmpire();
  const { theft } = await searchParams;
  const period: Period = theft === "day" ? "day" : "week";

  // Every board here is GLOBAL — ranked across the whole game, not scoped to a
  // single city like the /game/rankings list.
  //
  // All five boards are live — no cache anywhere behind them. They used to sit
  // behind a 20-second TTL, because `spy` and `power` were JS figures: the
  // top-ten cut could not move into SQL and every read was a full scan of Empire
  // plus its armies and arsenals, on every load and again every 30s per open tab
  // with no rate limit on RSC GETs. Now all five are indexed `ORDER BY … LIMIT
  // 10` (or one aggregate), so fifty rows come back instead of the table and a
  // balance that moved a second ago is already on the board.
  const [boards, theftRows] = await Promise.all([
    getGlobalBoards(),
    getTheftBoard(theftCutoff(period)),
  ]);

  return (
    <div className="space-y-6">
      {/* Balances, slaves and plunder all shift constantly — keep the boards live. */}
      <AutoRefresh intervalMs={30_000} />
      <SectionHeading
        title="טבלאות מובילים"
        ornament={<Icon name="rankings" size={22} className="text-crimson" />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-400">דירוג גלובלי על פני כל השחקנים במשחק.</p>
        <Link href="/game/rankings" className="btn btn-ghost px-4 py-2 text-sm">
          <Icon name="base" size={16} className="inline-block align-middle" /> דירוג העיר שלי
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Board
          title="עבדים"
          icon="mine"
          iconClass="text-crimson-bright"
          unit={<Icon name="mine" size={13} className="inline-block align-middle" />}
          rows={boards.slaves}
          myEmpireId={myEmpire.id}
          hideValue
        />
        <Board
          title="הבנק הגדול ביותר"
          icon="bank"
          iconClass="text-gold-bright"
          unit={<Icon name="gold" size={13} className="inline-block align-middle text-gold-bright" />}
          rows={boards.bank}
          myEmpireId={myEmpire.id}
          hideValue
        />
        <Board
          title="הריגול הגבוה ביותר"
          icon="spy"
          iconClass="text-crimson-bright"
          unit={<Icon name="spy" size={13} className="inline-block align-middle" />}
          rows={boards.spy}
          myEmpireId={myEmpire.id}
          hideValue
        />
        <Board
          title="כוח כללי"
          icon="spark"
          iconClass="text-gold-bright"
          unit={<Icon name="spark" size={13} className="inline-block align-middle" />}
          rows={boards.power}
          myEmpireId={myEmpire.id}
          hideValue
        />
      </div>

      {/* -------- biggest thefts, with a today / this-week toggle -------- */}
      <div className="panel-gold rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gold-bright">
            <Icon name="attack" size={18} className="text-crimson-bright" />
            הגניבות הגדולות ביותר
          </h3>
          <div className="flex gap-1.5">
            <Link
              href="/game/leaderboards?theft=day"
              className={`btn px-3 py-1.5 text-xs ${period === "day" ? "btn-gold" : "btn-ghost"}`}
            >
              היום
            </Link>
            <Link
              href="/game/leaderboards?theft=week"
              className={`btn px-3 py-1.5 text-xs ${period === "week" ? "btn-gold" : "btn-ghost"}`}
            >
              השבוע
            </Link>
          </div>
        </div>
        {theftRows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            לא נגנב זהב {period === "day" ? "היום" : "השבוע"} עדיין.
          </p>
        ) : (
          <ol className="space-y-1.5 text-sm">
            {theftRows.map((row, index) => {
              const isMe = row.empireId === myEmpire.id;
              const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
              return (
                <li
                  key={row.empireId}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${
                    isMe ? "bg-gold/10" : "hover:bg-panel-raised/50"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="nums w-5 shrink-0 text-center font-black text-gold" dir="ltr">
                      {medal ?? index + 1}
                    </span>
                    <Link
                      href={`/game/empires/${row.empireId}`}
                      className="truncate font-semibold text-zinc-100 underline-offset-4 hover:text-gold-bright hover:underline"
                    >
                      {row.name}
                    </Link>
                    {isMe && (
                      <span className="shrink-0 rounded-full bg-gold/15 px-1.5 text-[10px] font-bold text-gold">
                        את/ה
                      </span>
                    )}
                  </span>
                  <span className="nums inline-flex shrink-0 items-center gap-1 font-bold text-gold-bright" dir="ltr">
                    {formatNumber(row.value)} <Icon name="gold" size={13} className="inline-block align-middle text-gold-bright" />
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
