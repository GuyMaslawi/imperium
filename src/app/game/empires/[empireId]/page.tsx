import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  getEmpireAttackPower,
  getEmpireDefensePower,
  getEmpireSpyPower,
  getEmpireGeneralPower,
} from "@/lib/game/power";
import { weaponsPower } from "@/lib/game/weapons";
import { formatNumber, formatDate } from "@/lib/game/format";
import { RankActions } from "@/components/game/RankActions";

export const metadata = { title: "פרופיל אימפריה | אימפריום" };

/** A spy report counts as "recent" for this long. */
const SPY_REPORT_TTL_MS = 24 * 60 * 60 * 1000;

function recentSpyCutoff(): Date {
  return new Date(Date.now() - SPY_REPORT_TTL_MS);
}

export default async function EmpireProfilePage({
  params,
}: {
  params: Promise<{ empireId: string }>;
}) {
  const { empireId } = await params;
  const myEmpire = await requireEmpire();

  const empire = await prisma.empire.findUnique({
    where: { id: empireId },
    include: { army: true, user: true, season: true, weapons: true },
  });
  if (!empire) notFound();

  const isMe = empire.id === myEmpire.id;

  const spyReport = isMe
    ? null
    : await prisma.spyReport.findFirst({
        where: {
          attackerEmpireId: myEmpire.id,
          defenderEmpireId: empire.id,
          success: true,
          createdAt: { gte: recentSpyCutoff() },
        },
        orderBy: { createdAt: "desc" },
      });

  // Detailed powers are shown for your own empire, or once a recent
  // successful spy report exists. General power is always public.
  const showDetails = isMe || spyReport !== null;
  const generalPower = getEmpireGeneralPower(empire.army, empire.weapons);

  const powerRows = [
    { icon: "⚔️", label: "כוח התקפה", value: getEmpireAttackPower(empire.army, empire.weapons) },
    { icon: "🛡️", label: "כוח הגנה", value: getEmpireDefensePower(empire.army, empire.weapons) },
    { icon: "🕵️", label: "כוח מודיעין", value: getEmpireSpyPower(empire.army, empire.weapons) },
    { icon: "👑", label: "כוח כללי", value: generalPower },
  ];

  return (
    <div className="space-y-6">
      {/* -------- header + action bar -------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-100">
            👑 {empire.name}
            {isMe && (
              <span className="mr-3 rounded-full bg-gold/15 px-2.5 py-1 align-middle text-xs font-bold text-gold">
                זו האימפריה שלך
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            פרופיל ציבורי של האימפריה.
          </p>
        </div>
        {!isMe && (
          <div className="flex flex-wrap items-start gap-2">
            <RankActions
              targetEmpireId={empire.id}
              currentTurns={myEmpire.turns}
            />
            <button
              type="button"
              disabled
              title="מערכת הודעות בין שחקנים תתווסף בהמשך."
              className="cursor-not-allowed rounded-lg border border-gold-dim px-4 py-2 text-sm text-gold opacity-50"
            >
              ✉️ שליחת הודעה · בקרוב
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* -------- basic info -------- */}
        <Card>
          <CardTitle icon="📊">נתונים כלליים</CardTitle>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-400">רמה</dt>
              <dd className="font-bold text-zinc-100">{empire.level}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">כוח כללי</dt>
              <dd className="font-bold text-gold">⚡ {formatNumber(generalPower)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">אזרחים</dt>
              <dd className="font-bold text-zinc-100">{formatNumber(empire.citizens)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">שליט</dt>
              <dd className="font-medium text-zinc-100">{empire.user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">האימפריה נוסדה</dt>
              <dd className="font-medium text-zinc-100">{formatDate(empire.createdAt)}</dd>
            </div>
            {empire.season && (
              <div className="flex justify-between">
                <dt className="text-zinc-400">עונה</dt>
                <dd className="font-medium text-zinc-100">{empire.season.name}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* -------- power summary -------- */}
        <Card>
          <CardTitle icon="⚡">כוח האימפריה</CardTitle>
          {showDetails ? (
            <>
              {spyReport && (
                <p className="mb-3 text-xs text-zinc-500">
                  מבוסס על דוח ריגול מ־{formatDate(spyReport.createdAt)}
                </p>
              )}
              <dl className="space-y-2.5 text-sm">
                {powerRows.map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <dt className="text-zinc-400">
                      {row.icon} {row.label}
                    </dt>
                    <dd className="font-bold tabular-nums text-gold">
                      {formatNumber(row.value)}
                    </dd>
                  </div>
                ))}
              </dl>
              {isMe && (
                <Link
                  href="/game/weapons"
                  className="mt-4 inline-block text-sm font-semibold text-gold hover:text-gold-bright"
                >
                  ניהול נשקים ←
                </Link>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              בצע ריגול כדי לחשוף מידע נוסף על האימפריה.
            </p>
          )}
        </Card>
      </div>

      {/* -------- intelligence: revealed enemy details -------- */}
      {!isMe && (
        <Card>
          <CardTitle icon="🕵️">מידע מודיעיני</CardTitle>
          {spyReport ? (
            <>
              <p className="mb-3 text-xs text-zinc-500">
                מבוסס על דוח ריגול מ־{formatDate(spyReport.createdAt)}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm text-zinc-300 sm:grid-cols-3">
                <span>🪙 זהב: {formatNumber(spyReport.revealedGold ?? 0)}</span>
                <span>🪵 עץ: {formatNumber(spyReport.revealedWood ?? 0)}</span>
                <span>⚙️ ברזל: {formatNumber(spyReport.revealedIron ?? 0)}</span>
                <span>🪨 אבן: {formatNumber(spyReport.revealedStone ?? 0)}</span>
                <span>🪖 חיילים: {formatNumber(spyReport.revealedSoldiers ?? 0)}</span>
                <span>🕵️ מרגלים: {formatNumber(spyReport.revealedSpies ?? 0)}</span>
                <span>⛏️ עבדי מכרות: {formatNumber(spyReport.revealedMineSlaves ?? 0)}</span>
                <span>⚔️ נשקי התקפה: {formatNumber(weaponsPower(empire.weapons, "ATTACK"))}</span>
                <span>🛡️ נשקי הגנה: {formatNumber(weaponsPower(empire.weapons, "DEFENSE"))}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              בצע ריגול כדי לחשוף מידע נוסף על האימפריה.
            </p>
          )}
        </Card>
      )}

      {/* -------- future systems (compact placeholders) -------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="!p-4">
          <CardTitle icon="🦸" className="!mb-2 !text-base">גיבור</CardTitle>
          <p className="text-sm text-zinc-400">
            {isMe ? "מערכת הגיבור תיפתח בהמשך." : "כאן יוצג הגיבור של היריב."}
          </p>
        </Card>
        <Card className="!p-4">
          <CardTitle icon="🗡️" className="!mb-2 !text-base">חפצי גיבור</CardTitle>
          <p className="text-sm text-zinc-400">
            {isMe
              ? "כאן יוצגו חפצי הגיבור שלך בהמשך."
              : "כאן יוצגו חפצי הגיבור של היריב לאחר שמערכת הגיבורים תתווסף."}
          </p>
        </Card>
        <Card className="!p-4">
          <CardTitle icon="🤝" className="!mb-2 !text-base">ברית</CardTitle>
          <p className="text-sm text-zinc-400">מערכת הבריתות תיפתח בהמשך.</p>
        </Card>
      </div>
    </div>
  );
}
