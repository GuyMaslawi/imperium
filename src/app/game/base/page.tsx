import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  BUILDING_META,
  RESOURCE_META,
  UNIT_META,
  STORAGE_TYPES,
  storageCapacityForLevel,
  allowedDepositsPerDailyPeriod,
  bankInterestRate,
  type StorableResource,
} from "@/lib/game/constants";
import { productionPerTick } from "@/lib/game/resources";
import { PowerSummary } from "@/components/game/PowerSummary";
import { getTurnsGainPerRegularUpdate } from "@/lib/game/turns";
import {
  nextRegularUpdate,
  nextDailyUpdate,
  formatGameTime,
} from "@/lib/game/time";
import { formatNumber, formatDate } from "@/lib/game/format";

export const metadata = { title: "בסיס | אימפריום" };

export default async function BasePage() {
  const empire = await requireEmpire();

  const [recentBattles, recentSpies, recentBankTransactions, season] =
    await Promise.all([
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
      prisma.bankTransaction.findMany({
        where: { empireId: empire.id },
        orderBy: { createdAt: "desc" },
        take: 2,
      }),
      empire.seasonId
        ? prisma.gameSeason.findUnique({ where: { id: empire.seasonId } })
        : null,
    ]);

  const turnsPerUpdate = await getTurnsGainPerRegularUpdate(empire.id);
  const now = new Date();
  const nextRegularAt = nextRegularUpdate(empire.lastRegularUpdateAt);
  const nextDailyAt = nextDailyUpdate(now);

  /* ---- production: total per regular update, grouped by resource ---- */
  const productionByResource = new Map<StorableResource, number>();
  for (const building of empire.buildings) {
    const produced = BUILDING_META[building.type].producedResource;
    if (!produced) continue;
    productionByResource.set(
      produced,
      (productionByResource.get(produced) ?? 0) + productionPerTick(building)
    );
  }
  const productionRows = [...productionByResource.entries()].filter(
    ([, amount]) => amount > 0
  );

  const mineSlaves = empire.army?.mineSlaves ?? 0;
  const assignedSlaves = empire.buildings.reduce(
    (sum, b) => sum + b.slavesAssigned,
    0
  );

  /* ---- bank ---- */
  const bankGold = Math.floor(empire.bankAccount?.goldBalance ?? 0);
  const interestLevel =
    empire.upgrades.find((u) => u.type === "BANK_DAILY_INTEREST")?.level ?? 1;
  const depositLevel =
    empire.upgrades.find((u) => u.type === "BANK_DEPOSIT_COUNT")?.level ?? 1;
  const nextInterest = Math.floor(bankGold * bankInterestRate(interestLevel));
  const allowedDeposits = allowedDepositsPerDailyPeriod(depositLevel);
  const usedDeposits = empire.bankAccount?.depositsUsedInCurrentPeriod ?? 0;
  const remainingDeposits = Math.max(0, allowedDeposits - usedDeposits);

  /* ---- storage ---- */
  const totalStored = empire.storages.reduce(
    (sum, s) => sum + s.storedAmount,
    0
  );
  const totalCapacity = STORAGE_TYPES.reduce((sum, type) => {
    const level =
      empire.storages.find((s) => s.resourceType === type)?.level ?? 1;
    return sum + storageCapacityForLevel(level);
  }, 0);

  const hasActivity =
    recentBattles.length > 0 ||
    recentSpies.length > 0 ||
    recentBankTransactions.length > 0;

  const statusStats: { label: string; value: string; hint?: string }[] = [
    { label: "רמת אימפריה", value: formatNumber(empire.level) },
    ...(season ? [{ label: "עונה", value: season.name }] : []),
    {
      label: "תורות זמינות",
      value: formatNumber(empire.turns),
      hint: `+${turnsPerUpdate} בעדכון הרגיל הבא`,
    },
    {
      label: "עדכון רגיל הבא",
      value: formatGameTime(nextRegularAt),
      hint: "ייצור מכרות ותורות",
    },
    {
      label: "עדכון יומי הבא",
      value: formatGameTime(nextDailyAt),
      hint: "אזרחים וריבית בנק",
    },
  ];

  return (
    <div className="space-y-6">
      {/* -------- 1. empire status -------- */}
      <div>
        <h1 className="text-2xl font-black text-zinc-100">
          ברוך הבא, שליט {empire.name} 👑
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          מרכז הפיקוד של האימפריה שלך — כאן רואים הכול במבט אחד.
        </p>
      </div>

      <Card className="!p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {statusStats.map((stat) => (
            <div key={stat.label}>
              <p className="text-xs text-zinc-400">{stat.label}</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-gold">
                {stat.value}
              </p>
              {stat.hint && (
                <p className="text-[11px] leading-snug text-zinc-500">
                  {stat.hint}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* -------- 2. power summary -------- */}
      <PowerSummary army={empire.army} weapons={empire.weapons} />

      {/* -------- 3. main / secondary columns -------- */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* main column: production + army */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardTitle icon="⚒️">ייצור</CardTitle>
            {productionRows.length === 0 ? (
              <p className="text-sm text-zinc-400">
                אין ייצור פעיל — הצב עבדי מכרות במכרות כדי להתחיל להפיק
                משאבים.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-4">
                {productionRows.map(([resource, amount]) => (
                  <li key={resource} className="flex flex-col">
                    <span className="text-zinc-400">
                      {RESOURCE_META[resource].icon} {RESOURCE_META[resource].label}
                    </span>
                    <span className="font-bold tabular-nums text-emerald-400">
                      +{formatNumber(Math.floor(amount))} לעדכון רגיל
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3 text-sm">
              <span className="text-zinc-400">
                ⛏️ עבדים מוצבים במכרות:{" "}
                <span className="font-bold tabular-nums text-zinc-100">
                  {formatNumber(assignedSlaves)} מתוך {formatNumber(mineSlaves)}
                </span>
              </span>
              <Link
                href="/game/production"
                className="font-semibold text-gold hover:text-gold-bright"
              >
                ניהול ייצור ←
              </Link>
            </div>
          </Card>

          <Card>
            <CardTitle icon="⚔️">הצבא שלך</CardTitle>
            <ul className="grid grid-cols-3 gap-3 text-sm">
              <li className="flex flex-col">
                <span className="text-zinc-400">
                  {UNIT_META.soldiers.icon} חיילים
                </span>
                <span className="text-lg font-bold tabular-nums text-zinc-100">
                  {formatNumber(empire.army?.soldiers ?? 0)}
                </span>
              </li>
              <li className="flex flex-col">
                <span className="text-zinc-400">
                  {UNIT_META.spies.icon} מרגלים
                </span>
                <span className="text-lg font-bold tabular-nums text-zinc-100">
                  {formatNumber(empire.army?.spies ?? 0)}
                </span>
              </li>
              <li className="flex flex-col">
                <span className="text-zinc-400">
                  {UNIT_META.mineSlaves.icon} עבדי מכרות
                </span>
                <span className="text-lg font-bold tabular-nums text-zinc-100">
                  {formatNumber(mineSlaves)}
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

        {/* secondary column: bank + storage + recent activity */}
        <div className="space-y-4">
          <Card>
            <CardTitle icon="🏦">בנק</CardTitle>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-400">זהב בבנק</dt>
                <dd className="font-bold tabular-nums text-gold">
                  {formatNumber(bankGold)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">ריבית בעדכון הקרוב</dt>
                <dd className="font-bold tabular-nums text-emerald-400">
                  +{formatNumber(nextInterest)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">הפקדות שנותרו</dt>
                <dd className="font-bold tabular-nums text-zinc-100">
                  {formatNumber(remainingDeposits)} מתוך{" "}
                  {formatNumber(allowedDeposits)}
                </dd>
              </div>
            </dl>
            <Link
              href="/game/bank"
              className="mt-4 block text-sm font-semibold text-gold hover:text-gold-bright"
            >
              לבנק ←
            </Link>
          </Card>

          <Card>
            <CardTitle icon="🏛️">מחסנים</CardTitle>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">משאבים מאוחסנים</span>
              <span className="font-bold tabular-nums text-zinc-100">
                {formatNumber(Math.floor(totalStored))} מתוך{" "}
                {formatNumber(totalCapacity)}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              משאבים במחסן מוגנים מפני שוד בתקיפה.
            </p>
            <Link
              href="/game/storage"
              className="mt-4 block text-sm font-semibold text-gold hover:text-gold-bright"
            >
              למחסנים ←
            </Link>
          </Card>

          <Card>
            <CardTitle icon="📜">פעילות אחרונה</CardTitle>
            {!hasActivity ? (
              <p className="text-sm text-zinc-400">
                אין דיווחים עדיין. היכנס לפרופיל אימפריה מעמוד הדירוג כדי לרגל
                או לתקוף.
              </p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {recentBattles.map((r) => {
                  const isAttacker = r.attackerEmpireId === empire.id;
                  const won = r.winnerEmpireId === empire.id;
                  const rival = isAttacker
                    ? r.defenderEmpire.name
                    : r.attackerEmpire.name;
                  return (
                    <li key={r.id} className="flex flex-col gap-0.5">
                      <span className="text-zinc-300">
                        {isAttacker ? "⚔️ תקפת את" : "🛡️ הותקפת על ידי"}{" "}
                        <span className="font-semibold">{rival}</span> —{" "}
                        <span className={won ? "text-emerald-400" : "text-red-400"}>
                          {won ? "ניצחון" : "הפסד"}
                        </span>
                      </span>
                      <span className="text-xs text-zinc-500">
                        {formatDate(r.createdAt)}
                      </span>
                    </li>
                  );
                })}
                {recentSpies.map((r) => (
                  <li key={r.id} className="flex flex-col gap-0.5">
                    <span className="text-zinc-300">
                      🕵️ ריגלת אחרי{" "}
                      <span className="font-semibold">{r.defenderEmpire.name}</span>{" "}
                      —{" "}
                      <span className={r.success ? "text-emerald-400" : "text-red-400"}>
                        {r.success ? "הצלחה" : "כישלון"}
                      </span>
                    </span>
                    <span className="text-xs text-zinc-500">
                      {formatDate(r.createdAt)}
                    </span>
                  </li>
                ))}
                {recentBankTransactions.map((t) => (
                  <li key={t.id} className="flex flex-col gap-0.5">
                    <span className="text-zinc-300">
                      🏦{" "}
                      {t.type === "DEPOSIT"
                        ? "הפקדה לבנק"
                        : t.type === "WITHDRAW"
                          ? "משיכה מהבנק"
                          : "ריבית מהבנק"}{" "}
                      —{" "}
                      <span className="font-semibold tabular-nums" dir="ltr">
                        {t.type === "WITHDRAW" ? "-" : "+"}
                        {formatNumber(t.amount)}
                      </span>
                    </span>
                    <span className="text-xs text-zinc-500">
                      {formatDate(t.createdAt)}
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
      </div>
    </div>
  );
}
