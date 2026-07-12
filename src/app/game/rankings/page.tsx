import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { getEmpireMilitaryPower } from "@/lib/game/power";
import { formatCompact, formatNumber } from "@/lib/game/format";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "דירוג | אימפריום" };

export default async function RankingsPage() {
  const myEmpire = await requireEmpire();

  const empires = await prisma.empire.findMany({
    include: { army: true, weapons: true },
  });

  const ranked = empires
    .map((e) => ({
      ...e,
      power: getEmpireMilitaryPower(e.army, e.weapons),
    }))
    .sort((a, b) => b.power - a.power || b.level - a.level);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">דירוג האימפריות 🏆</h1>
        <p className="mt-1 text-sm text-zinc-400">
          כל האימפריות במשחק, מדורגות לפי עוצמה צבאית.
        </p>
        <p className="mt-1 text-sm font-medium text-gold">
          כדי לבצע ריגול או תקיפה, היכנסו לפרופיל האימפריה.
        </p>
      </div>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-right text-xs text-zinc-400">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">אימפריה</th>
              <th className="px-4 py-3 font-semibold">רמה</th>
              <th className="px-4 py-3 font-semibold">עוצמה צבאית</th>
              <th className="px-4 py-3 font-semibold">אזרחים</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((empire, index) => {
              const isMe = empire.id === myEmpire.id;
              return (
                <tr
                  key={empire.id}
                  className={`border-b border-border-subtle last:border-b-0 ${
                    isMe ? "bg-gold/5" : "hover:bg-surface-raised/50"
                  }`}
                >
                  <td className="px-4 py-3 font-bold text-zinc-400">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/game/empires/${empire.id}`}
                      className="font-bold text-zinc-100 underline-offset-4 hover:text-gold hover:underline"
                    >
                      {empire.name}
                    </Link>
                    {isMe && (
                      <span className="mr-2 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
                        האימפריה שלך
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">{empire.level}</td>
                  <td className="px-4 py-3 font-bold tabular-nums text-gold">
                    ⚡ {formatCompact(empire.power)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">
                    {formatNumber(empire.citizens)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
