import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatNumber, formatDate } from "@/lib/game/format";

export const metadata = { title: "דוחות | אימפריום" };

export default async function ReportsPage() {
  const empire = await requireEmpire();

  const [battles, spies] = await Promise.all([
    prisma.battleReport.findMany({
      where: {
        OR: [{ attackerEmpireId: empire.id }, { defenderEmpireId: empire.id }],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { attackerEmpire: true, defenderEmpire: true },
    }),
    prisma.spyReport.findMany({
      where: { attackerEmpireId: empire.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { defenderEmpire: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">דוחות 📜</h1>
        <p className="mt-1 text-sm text-zinc-400">
          כל דוחות הקרב ומשימות הריגול של האימפריה שלך.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle icon="⚔️">דוחות קרב</CardTitle>
          {battles.length === 0 ? (
            <p className="text-sm text-zinc-400">אין דוחות קרב עדיין.</p>
          ) : (
            <ul className="space-y-3">
              {battles.map((report) => {
                const isAttacker = report.attackerEmpireId === empire.id;
                const won = report.winnerEmpireId === empire.id;
                const rival = isAttacker
                  ? report.defenderEmpire.name
                  : report.attackerEmpire.name;
                const myLossSoldiers = isAttacker
                  ? report.attackerSoldiersLost
                  : report.defenderSoldiersLost;
                const totalStolen =
                  report.stolenGold +
                  report.stolenWood +
                  report.stolenIron +
                  report.stolenStone;

                return (
                  <li
                    key={report.id}
                    className={`rounded-lg border p-3 text-sm ${
                      won
                        ? "border-emerald-900/70 bg-emerald-950/30"
                        : "border-red-900/70 bg-red-950/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-zinc-100">
                        {isAttacker ? `⚔️ תקיפה על ${rival}` : `🛡️ הגנה מפני ${rival}`}{" "}
                        —{" "}
                        <span className={won ? "text-emerald-400" : "text-red-400"}>
                          {won ? "ניצחון!" : "הפסד"}
                        </span>
                      </p>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-zinc-400">
                      {report.attackerSoldiersPower !== null && (
                        <p>
                          תוקף: 🪖 {formatNumber(report.attackerSoldiersPower ?? 0)}{" "}
                          מחיילים + 🗡️ {formatNumber(report.attackerWeaponsPower ?? 0)}{" "}
                          מנשקים · מגן: 🪖{" "}
                          {formatNumber(report.defenderSoldiersPower ?? 0)} מחיילים + 🛡️{" "}
                          {formatNumber(report.defenderWeaponsPower ?? 0)} מנשקים
                        </p>
                      )}
                      <p>
                        עוצמת תוקף סופית: {formatNumber(report.attackerPower)} · עוצמת
                        מגן סופית (כולל בונוס הגנה): {formatNumber(report.defenderPower)}
                      </p>
                      <p>האבדות שלך: {myLossSoldiers} חיילים</p>
                      {isAttacker && (
                        <p>עלות הפעולה: {report.turnsSpent} תורות</p>
                      )}
                      {totalStolen > 0 && (
                        <p className={isAttacker === won ? "text-gold" : ""}>
                          שלל: 🪙 {formatNumber(report.stolenGold)} · 🪵{" "}
                          {formatNumber(report.stolenWood)} · ⚙️{" "}
                          {formatNumber(report.stolenIron)} · 🪨{" "}
                          {formatNumber(report.stolenStone)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle icon="🕵️">דוחות ריגול</CardTitle>
          {spies.length === 0 ? (
            <p className="text-sm text-zinc-400">אין דוחות ריגול עדיין.</p>
          ) : (
            <ul className="space-y-3">
              {spies.map((report) => (
                <li
                  key={report.id}
                  className={`rounded-lg border p-3 text-sm ${
                    report.success
                      ? "border-emerald-900/70 bg-emerald-950/30"
                      : "border-red-900/70 bg-red-950/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-zinc-100">
                      🕵️ ריגול אחרי {report.defenderEmpire.name} —{" "}
                      <span
                        className={report.success ? "text-emerald-400" : "text-red-400"}
                      >
                        {report.success ? "המשימה הצליחה" : "המרגל נתפס"}
                      </span>
                    </p>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatDate(report.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    עלות הפעולה: {report.turnsSpent} תורות
                    {report.finalChance !== null &&
                      ` · סיכוי הצלחה: ${Math.round((report.finalChance ?? 0) * 100)}%`}
                    {report.weaponsBonus !== null &&
                      (report.weaponsBonus ?? 0) > 0 &&
                      ` (מתוכו +${Math.round(report.weaponsBonus ?? 0)}% מנשקי ריגול)`}
                  </p>
                  {report.success ? (
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-zinc-400 sm:grid-cols-3">
                      <span>🪙 זהב: {formatNumber(report.revealedGold ?? 0)}</span>
                      <span>🪵 עץ: {formatNumber(report.revealedWood ?? 0)}</span>
                      <span>⚙️ ברזל: {formatNumber(report.revealedIron ?? 0)}</span>
                      <span>🪨 אבן: {formatNumber(report.revealedStone ?? 0)}</span>
                      <span>🪖 חיילים: {formatNumber(report.revealedSoldiers ?? 0)}</span>
                      <span>🕵️ מרגלים: {formatNumber(report.revealedSpies ?? 0)}</span>
                      <span>⛏️ עבדי מכרות: {formatNumber(report.revealedMineSlaves ?? 0)}</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-400">
                      המרגל אבד במשימה ולא הושג מידע.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
