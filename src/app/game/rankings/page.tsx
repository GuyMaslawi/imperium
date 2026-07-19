import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { getEmpireMilitaryPower } from "@/lib/game/power";
import { applyPendingUpdates } from "@/lib/game/updates";
import { lastDailyUpdate } from "@/lib/game/time";
import { formatCompact, formatNumber } from "@/lib/game/format";
import { AutoRefresh } from "@/components/game/AutoRefresh";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "דירוג | אימפריום" };

export default async function RankingsPage() {
  const myEmpire = await requireEmpire();

  // The game clock is lazy (applied when an empire is loaded), so empires of
  // players who haven't logged in since the last daily update would show
  // stale numbers here. Settle just those — at most twice a day per empire.
  const staleDaily = await prisma.empire.findMany({
    where: {
      id: { not: myEmpire.id },
      lastDailyUpdateAt: { lt: lastDailyUpdate(new Date()) },
    },
    select: { id: true },
  });
  await Promise.all(
    staleDaily.map((empire) =>
      applyPendingUpdates(empire.id).catch(() => {
        // Best-effort: a failed settle must never block the rankings.
      })
    )
  );

  const empires = await prisma.empire.findMany({
    include: { army: true, weapons: true, hero: true },
  });

  const ranked = empires
    .map((e) => ({
      ...e,
      power: getEmpireMilitaryPower(e.army, e.weapons),
    }))
    .sort((a, b) => b.power - a.power || b.level - a.level);

  const myRank = ranked.findIndex((e) => e.id === myEmpire.id) + 1;

  const podium = ranked.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Other players train, attack and rise in rank — keep the table live. */}
      <AutoRefresh intervalMs={30_000} />
      <SectionHeading title="דירוג" subtitle="LEADERBOARD" ornament={<Icon name="rankings" size={22} className="text-crimson" />} />

      {/* -------- status strip -------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-panel-inset px-3 py-1.5 text-xs text-zinc-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_var(--color-accent-green)]" />
          אונליין (48ש):{" "}
          <span className="nums font-bold text-emerald-400" dir="ltr">
            {ranked.length}
          </span>
        </span>
        <span className="text-xs text-zinc-400">
          בדירוג שלך:{" "}
          <span className="nums font-bold text-gold-bright" dir="ltr">
            {myRank}
          </span>{" "}
          / מוסתרים:{" "}
          <span className="nums font-bold text-zinc-300" dir="ltr">
            0
          </span>{" "}
          🔒
        </span>
      </div>

      {/* -------- filters -------- */}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost px-4 py-2 text-sm">
          לפי העיר שלי
        </button>
        <button type="button" className="btn btn-dark px-4 py-2 text-sm">
          הצבאות הטובים ביותר
        </button>
        <button type="button" className="btn btn-ghost px-4 py-2 text-sm">
          דירוג בריתות
        </button>
      </div>

      {/* -------- leaderboard -------- */}
      <div className="panel-gold overflow-x-auto rounded-xl p-0">
        <h2 className="flex items-center gap-2 px-4 pb-3 pt-4 text-base font-bold tracking-wide text-gold-bright">
          <Icon name="rankings" size={20} className="text-crimson-bright" />
          דירוג לפי ואלקריה
        </h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-border-subtle text-right text-xs text-gold-dim">
              <th className="px-4 py-2.5 font-semibold">#</th>
              <th className="px-4 py-2.5 font-semibold">שם הצבא</th>
              <th className="px-4 py-2.5 font-semibold">ברית</th>
              <th className="px-4 py-2.5 font-semibold">זהב</th>
              <th className="px-4 py-2.5 font-semibold">חיילים</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((empire, index) => {
              const isMe = empire.id === myEmpire.id;
              const medal =
                index === 0
                  ? "🥇"
                  : index === 1
                    ? "🥈"
                    : index === 2
                      ? "🥉"
                      : null;
              return (
                <tr
                  key={empire.id}
                  className={`border-b border-border-subtle last:border-b-0 ${
                    isMe ? "bg-gold/5" : "hover:bg-panel-raised/50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="nums font-black text-gold" dir="ltr">
                      {medal ?? index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gradient-to-b from-gold-deep/40 to-black text-lg">
                        <Icon name="crown" size={20} className="text-bone" />
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/game/empires/${empire.id}`}
                          className="font-bold text-zinc-100 underline-offset-4 hover:text-gold-bright hover:underline"
                        >
                          {empire.name}
                        </Link>{" "}
                        <span className="text-xs text-gold-dim">
                          (רמה{" "}
                          <span className="nums" dir="ltr">
                            {empire.level}
                          </span>
                          ) <Icon name="spark" size={14} className="inline-block align-middle" />
                        </span>
                        {isMe && (
                          <span className="mr-1.5 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                            הצבא שלך
                          </span>
                        )}
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-[11px] text-zinc-500">גיבור</span>
                          <span
                            className="nums inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-1.5 text-[10px] font-bold text-gold-bright"
                            dir="ltr"
                            title={`רמת הגיבור: ${empire.hero?.level ?? 1}`}
                          >
                            <Icon name="attack" size={12} className="inline-block align-middle" /> {empire.hero?.level ?? 1}
                          </span>
                          {(empire.hero?.resets ?? 0) > 0 && (
                            <span
                              className="nums rounded-full border border-purple-400/50 bg-purple-950/60 px-1.5 text-[10px] font-black text-purple-300"
                              dir="ltr"
                              title={`הגיבור אופס ${empire.hero!.resets} פעמים ברמה 100`}
                            >
                              ↻×{empire.hero!.resets}
                            </span>
                          )}
                          <span className="nums inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-1.5 text-[10px] font-bold text-red-400" dir="ltr">
                            100 <Icon name="heart" size={12} className="inline-block align-middle" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">—</td>
                  <td className="px-4 py-3">
                    <span
                      className="nums inline-flex items-center gap-1 font-bold text-gold-bright"
                      dir="ltr"
                    >
                      {formatNumber(Math.floor(empire.gold))} <Icon name="gold" size={14} className="inline-block align-middle" />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="nums text-zinc-300" dir="ltr">
                      {formatNumber(empire.army?.soldiers ?? 0)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* -------- hall of fame -------- */}
      <div>
        <h2 className="mb-3 flex items-center justify-center gap-2 text-base font-bold tracking-wide text-gold-bright">
          <Icon name="rankings" size={20} className="text-crimson-bright" />
          היכל התהילה
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel rounded-xl p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gold"><Icon name="guild" size={18} className="text-crimson-bright" /> בריתות</h3>
            <p className="text-sm text-zinc-500">מערכת הבריתות תיפתח בהמשך.</p>
          </div>
          <div className="panel rounded-xl p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gold"><Icon name="spy" size={18} className="text-crimson-bright" /> מודיעין</h3>
            <p className="text-sm text-zinc-500">
              דירוג המודיעין ייפתח בהמשך.
            </p>
          </div>
          <div className="panel-gold rounded-xl p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gold-bright">
              <Icon name="attack" size={18} className="text-crimson-bright" /> כוח צבאי
            </h3>
            <ol className="space-y-2 text-sm">
              {podium.map((empire, index) => (
                <li
                  key={empire.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                    </span>
                    <span className="truncate font-semibold text-zinc-100">
                      {empire.name}
                    </span>
                  </span>
                  <span className="nums shrink-0 font-bold text-gold" dir="ltr">
                    {formatCompact(empire.power)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
