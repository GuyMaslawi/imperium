import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  BUILDING_META,
  RESOURCE_META,
  UNIT_META,
  type ResourceKey,
} from "@/lib/game/constants";
import { productionPerTick } from "@/lib/game/resources";
import { armyPower } from "@/lib/game/power";
import { getTurnsGainPerRegularUpdate } from "@/lib/game/turns";
import { nextRegularUpdate, formatGameTime } from "@/lib/game/time";
import { formatNumber, formatDate } from "@/lib/game/format";

export const metadata = { title: "בסיס | אימפריום" };

export default async function BasePage() {
  const empire = await requireEmpire();

  const [recentBattles, recentSpies] = await Promise.all([
    prisma.battleReport.findMany({
      where: {
        OR: [{ attackerEmpireId: empire.id }, { defenderEmpireId: empire.id }],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { attackerEmpire: true, defenderEmpire: true },
    }),
    prisma.spyReport.findMany({
      where: { attackerEmpireId: empire.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { defenderEmpire: true },
    }),
  ]);

  const resourceKeys: ResourceKey[] = ["gold", "wood", "iron", "stone", "diamonds", "citizens"];
  const resourceValues: Record<ResourceKey, number> = {
    gold: empire.gold,
    wood: empire.wood,
    iron: empire.iron,
    stone: empire.stone,
    diamonds: empire.diamonds,
    citizens: empire.citizens,
    turns: empire.turns,
  };

  const turnsPerUpdate = await getTurnsGainPerRegularUpdate(empire.id);
  const nextRegularAt = nextRegularUpdate(empire.lastRegularUpdateAt);

  const producers = empire.buildings.filter(
    (b) => BUILDING_META[b.type].producedResource !== null
  );
  const power = armyPower(empire.army);
  const mineSlaves = empire.army?.mineSlaves ?? 0;
  const assignedSlaves = empire.buildings.reduce((sum, b) => sum + b.slavesAssigned, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">
          ברוך הבא, שליט {empire.name} 👑
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          מרכז הפיקוד של האימפריה שלך — כאן רואים הכול במבט אחד.
        </p>
      </div>

      {/* Resource cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {resourceKeys.map((key) => (
          <Card key={key} className="!p-4 text-center">
            <div aria-hidden className="text-2xl">{RESOURCE_META[key].icon}</div>
            <p className="mt-1 text-xs text-zinc-400">{RESOURCE_META[key].label}</p>
            <p className="text-lg font-bold tabular-nums text-zinc-100">
              {formatNumber(resourceValues[key])}
            </p>
          </Card>
        ))}
      </div>

      {/* Turns: the fuel of aggressive actions (spying / attacking) */}
      <Card className="!p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-3xl">⏳</span>
            <div>
              <h3 className="font-bold text-zinc-100">תורות זמינות</h3>
              <p className="text-xl font-black tabular-nums text-gold">
                {formatNumber(empire.turns)}
              </p>
            </div>
          </div>
          <div className="text-sm text-zinc-400">
            <p className="font-semibold text-emerald-400">
              +{turnsPerUpdate} תורות בעדכון הרגיל הבא
            </p>
            <p className="text-xs">
              העדכון הרגיל הבא בשעה {formatGameTime(nextRegularAt)} · תורות
              משמשים לריגול ולתקיפה
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Quick stats */}
        <Card>
          <CardTitle icon="📊">נתוני אימפריה</CardTitle>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-400">רמת אימפריה</dt>
              <dd className="font-bold text-zinc-100">{empire.level}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">עוצמה צבאית</dt>
              <dd className="font-bold text-gold">{formatNumber(power)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">עבדי מכרות</dt>
              <dd className="font-bold text-zinc-100">{formatNumber(mineSlaves)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">עבדים מוצבים במכרות</dt>
              <dd className="font-bold text-zinc-100">{formatNumber(assignedSlaves)}</dd>
            </div>
          </dl>
        </Card>

        {/* Production summary */}
        <Card>
          <CardTitle icon="⚒️">ייצור</CardTitle>
          <ul className="space-y-2.5 text-sm">
            {producers.map((b) => {
              const meta = BUILDING_META[b.type];
              return (
                <li key={b.id} className="flex justify-between">
                  <span className="text-zinc-400">
                    {meta.icon} {meta.label} (רמה {b.level})
                  </span>
                  <span className="font-bold tabular-nums text-emerald-400">
                    +{formatNumber(productionPerTick(b))} לעדכון רגיל
                  </span>
                </li>
              );
            })}
          </ul>
          <Link
            href="/game/production"
            className="mt-4 block text-sm font-semibold text-gold hover:text-gold-bright"
          >
            ניהול ייצור ←
          </Link>
        </Card>

        {/* Army summary */}
        <Card>
          <CardTitle icon="⚔️">הצבא שלך</CardTitle>
          <ul className="space-y-2.5 text-sm">
            <li className="flex justify-between">
              <span className="text-zinc-400">{UNIT_META.soldiers.icon} חיילים</span>
              <span className="font-bold tabular-nums text-zinc-100">
                {formatNumber(empire.army?.soldiers ?? 0)}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-zinc-400">{UNIT_META.spies.icon} מרגלים</span>
              <span className="font-bold tabular-nums text-zinc-100">
                {formatNumber(empire.army?.spies ?? 0)}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-zinc-400">{UNIT_META.mineSlaves.icon} עבדי מכרות</span>
              <span className="font-bold tabular-nums text-zinc-100">
                {formatNumber(empire.army?.mineSlaves ?? 0)}
              </span>
            </li>
          </ul>
          <Link
            href="/game/army"
            className="mt-4 block text-sm font-semibold text-gold hover:text-gold-bright"
          >
            אימון צבא ←
          </Link>
        </Card>
      </div>

      {/* Recent reports */}
      <Card>
        <CardTitle icon="📜">דיווחים אחרונים</CardTitle>
        {recentBattles.length === 0 && recentSpies.length === 0 ? (
          <p className="text-sm text-zinc-400">
            אין דיווחים עדיין. רגל או תקוף אימפריה מעמוד הדירוג כדי להתחיל.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recentBattles.map((r) => {
              const isAttacker = r.attackerEmpireId === empire.id;
              const won = r.winnerEmpireId === empire.id;
              const rival = isAttacker ? r.defenderEmpire.name : r.attackerEmpire.name;
              return (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-zinc-300">
                    {isAttacker ? "⚔️ תקפת את" : "🛡️ הותקפת על ידי"}{" "}
                    <span className="font-semibold">{rival}</span> —{" "}
                    <span className={won ? "text-emerald-400" : "text-red-400"}>
                      {won ? "ניצחון" : "הפסד"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {formatDate(r.createdAt)}
                  </span>
                </li>
              );
            })}
            {recentSpies.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span className="text-zinc-300">
                  🕵️ ריגלת אחרי{" "}
                  <span className="font-semibold">{r.defenderEmpire.name}</span> —{" "}
                  <span className={r.success ? "text-emerald-400" : "text-red-400"}>
                    {r.success ? "הצלחה" : "כישלון"}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {formatDate(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/game/reports"
          className="mt-4 block text-sm font-semibold text-gold hover:text-gold-bright"
        >
          לכל הדוחות ←
        </Link>
      </Card>
    </div>
  );
}
